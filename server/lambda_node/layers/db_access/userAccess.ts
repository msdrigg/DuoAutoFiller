import httpUtils from "../utils/httpUtils";
import constants from "../utils/constants";
import { DocumentClient, GetItemOutput, PutItemInput, PutItemOutput } from "aws-sdk/clients/dynamodb";
import { AWSError } from "aws-sdk";
import { FrontendUser, UserUpdate } from "../model/users";

/**
 * Gets the user metadata cooresponding to this userEmail and sessionId.
 * 
 * @param {string} [userEmail] The email for the user
 * @param {DocumentClient} [dynamo] Client for accessing dynamodb
 * 
 * @throws {AWSError} Any dynamodb error other than ResourceNotFound
 * @returns {FrontendUser|undefined} The user 
 */
async function getUser(userEmail: string, dynamo: DocumentClient) {
    // Function to get user given the email, and return the user (undefined if no user exists)
    let user: DatabaseUser;
    let result = await dynamo.get({
        TableName: constants.TABLE_NAME,
        Key: {
            PKCombined: userEmail,
            SKCombined: "M#"
        }
    }).promise().catch(function (err: AWSError) {
        console.log("Getting error in call to getuser")
        if (err.code == "ResourceNotFound") {
            return undefined;
        }
        throw err;
    });
    user = result.Item as DatabaseUser;

    if (user === undefined) {
        return undefined
    }

    console.log("gotten user in getUser")
    console.log(user)
    return {
        email: userEmail,
        passwordInfo: user.passwordInfo,
        context: user.context,
        signupDate: new Date(user.temporal)
    };
}

/**
 * Creates a user and returns the created user
 * 
 * @param {string} [userEmail] The email for the user
 * @param {string} [passwordHash] The hashed password from the user
 * @param {typedefs.UserContext} [context] Context for the user
 * @param {AWS DynamoDB.DocumentClient} [dynamo] Client for accessing dynamodb
 * 
 * @throws {typedefs.DynamoError} Any dynamodb error creating the user
 * @returns {typedefs.FrontendUser|undefined} The user created, undefined if the user fails to be created
 */
async function createUser(userEmail: string, passwordHash: string, context: Object, dynamo: DocumentClient) {
    let newPasswordSalt = httpUtils.getRandomString(40);
    let backendUser: DatabaseUser = {
        PKCombined: userEmail,
        SKCombined: "M#",
        context: context,
        temporal: Date.now(),
        passwordInfo: {
            storedHash: httpUtils.hashSalted(passwordHash, newPasswordSalt, constants.DEFAULT_HASH_FUNCTION),
            hashFunction: constants.DEFAULT_HASH_FUNCTION,
            salt: newPasswordSalt
        }
    }

    let dynamoParams: DocumentClient.PutItemInput = {
        TableName: constants.TABLE_NAME,
        Item: backendUser,
        ConditionExpression: 'PKCombined <> :userEmail',
        ExpressionAttributeValues: {
            ':userEmail': backendUser.PKCombined
        },
        ReturnValues: "ALL_NEW"
    }

    await dynamo
        .put(dynamoParams)
        .promise()
        .then(function (output: PutItemOutput) {
            return 
        })
        .catch(function (err: AWSError) {
            if (err.code == 'ConditionalCheckFailedException' ) {
                return ;
            } else {
                throw err;
            }
        })
}

/**
 * Updates a user and returns the new user
 * 
 * @param {string} [userEmail] The email for the user
 * @param {typedefs.UserUpdater} [changes] This field contains the changes matching the requested field
 * @param {AWS DynamoDB.DocumentClient} [dynamo] Client for accessing dynamodb
 * 
 * @throws {typedefs.DynamoError} Any dynamodb error creating the user
 * @returns {typedefs.FrontendUser|typedefs.ErrorResponse} The user updated, or an error if there was no supplied changes
 */
async function updateUser(userEmail: string, changes: UserUpdate, dynamo: DocumentClient) {
    // For updates to email or psw, we need to re-encrypt all encryptedData,
    // invalidate all sessions, and change user password hash and email

    let user: FrontendUser;

    if (!changes.context && !changes.email && !changes.passwordHash) {
        return httpUtils.getErrorResponseObject("No changes given", 400);
    }

    if (changes.context) {
        // Update user context
        // Request: {$context variables to update}
        let updatedContext = Object.keys(changes.context)
            .filter(key => constants.UPDATEABLE_USER_METADATA.includes(key))
            .reduce((obj, key) => {
                obj[key] = changes[key];
                return obj;
            }, {});
        
        if (!Object.keys(updatedContext).length) {
            let result: GetItemOutput = await dynamo.get({
                TableName: constants.TABLE_NAME,
                Key: {
                    PKCombined: userEmail,
                    SKCombined: "M#"
                }
            }).promise();

            return result.Item;
        } 
        
        let updateExpression = "SET";
        let expressionAttributeNames = {
            "#context": "context"
        };
        let expressionAttributeValues = {};
        
        for (const key in updatedContext) {
            updateExpression = `${updateExpression} #context.#${key} = :${key}Value,`;
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:${key}Value`] = updatedContext[key];
        }
        updateExpression = updateExpression.slice(1);

        let dynamoResult = await dynamo.update({
            TableName: constants.TABLE_NAME,
            Key: {
                PKCombined: userEmail,
                SKCombined: "M#"
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: "ALL_NEW",
        }).promise();

        user = dynamoResult.Attributes;
    }



    if (changes.email && changes.email != userEmail) {
        // Update user email
        // Delete session
        // Create new user, freeze old user, copy vault over to new user
        
        // We change email in the next session.
        // Most of the steps are the same, so we don't repeat most steps twice
        throw new Error("Changing email or password is not yet implemented");

    } else if (changes.passwordHash) {
        // NOTE: If we change the email, we automatically change the password hash,
        // so don't do this step if email has already changed

        // 1. Update user metadata
        // a. Lock user
        // b. Delete sessions
        // 3. Go through each key and move current encrypted data to context field, add new encrypted data field in its place
        // 4. Update user's passwordInfo file
        // 5. Go through each key and delete old encrypted data from context field

        throw new Error("Changing email or password is not yet implemented");
    }
    // OLD STEPS: 
    // Steps: 
    //  CLIENT: Logs out user
    //  0. CAN WE SOMEHOW THROW OUT TTL ON LAMBDA SESSION AUTHENTICATION
    //  1. Invalidate user. (user: Locked parameter to user metadata) And download to get current key version
    //  2. Delete all sessions (batches of 25, retrying errors, exponential backoff)
    //  2o. If we are changing user, create new user with proper metadata and lock on
    //  3. Download all keys in batches of 25?50?
    //      modify them to include new encrypted data, and new email, or new key version
    //      move up lastContentUpdate to NOW
    //  4. Upload all keys to their new places (with or without new email, and WITH NEW IDS, WITH KEY INDICATORS)
    //      delete old versions in the update itself (transaction)
    //      batches of 5
    //  5. Revalidate user (new if new email, old if not new email)
    //  5o. If we are changing email, delete entire old user
    //  IF WE FAIL DURING STEP (After 2 retries of operation). Always retry lock revert 5x
    //       (then open async lambda to revert it if failure occurs) Finally return failure to user
    //  1. No additional work needed
    //  2. No additional work needed
    //  2o Also attempt to delete user?
    //  3. No additional work needed
    //  4. Return failure including which keys aren't working and open aschronous lambda to fix. 
    //      When future logins download the keys with old key versions, client will attempt fix WITHOUT throwing out current 
    //      version of key if it is downloaded. Request user to re-input old password if old password isn't saved
    //      Any future useAndUpdate this key should include re-encrypted key, so we can update it from that
    //  5. Open aschronous lambda mandating that it gets fixed. 
    //  We also need to check user lock on login. If the lock exists, something has failed. We need to ask them to 
    //  Enter their old email or password (depending on which has changed), and we can re-start the migration

    return user
}

export default {
    getUser,
    updateUser,
    createUser
};