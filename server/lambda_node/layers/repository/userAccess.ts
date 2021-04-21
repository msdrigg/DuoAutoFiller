import httpUtils from "../utils/httpUtils";
import constants from "../utils/constants";
import { UserAuthVerifier, CoreUser, UserUpdate } from "../model/users";
import { createResponsibleError, getCoreUser, getResponsibleError } from "./model/mapping";
import { DatabaseUser } from "./model/models";
import { BaseContext, ErrorType, isError, ResultOrError } from "../model/common";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, UpdateCommandInput, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb";
import { isAWSError } from "./model/errors";

/**
 * Gets the user metadata cooresponding to this userEmail and sessionId.
 * 
 * @param {string} [userEmail] The email for the user
 * @param {DocumentClient} [dynamo] Client for accessing dynamodb
 * 
 * @throws {AWSError} Any dynamodb error other than ResourceNotFound
 * @returns {CoreUser|undefined} The user 
 */
async function getUser(userEmail: string, dynamo: DynamoDBDocumentClient): Promise<ResultOrError<CoreUser>> {
    return getAuthUser(userEmail, dynamo).then(result => {
        if (isError(result)) {
            return result;
        } else {
            return {
                Email: result.Email,
                Context: result.Context
            }
        }
    })
}

export async function getAuthUser(userEmail: string, dynamo: DynamoDBDocumentClient): Promise<ResultOrError<UserAuthVerifier>> {
    // Function to get user given the email, and return the user (undefined if no user exists)
    const params: GetCommand = new GetCommand( {
        TableName: constants.TABLE_NAME,
        Key: {
            PKCombined: userEmail,
            SKCombined: "M#"
        }
    });
    return await dynamo.send(params).then( result => {
        if (result.Item === undefined) {
            return createResponsibleError(ErrorType.DatabaseError, "User not found in database", 404)
        }
        const databaseUser = result.Item as unknown as DatabaseUser;
        return {
            Email: databaseUser.PKCombined,
            Context: databaseUser.Context,
            PasswordInfo: databaseUser.PasswordInfo,

        };
    }).catch( (err: unknown) => {
        if (isAWSError(err) && err.name == "ResourceNotFoundException") {
            return createResponsibleError(
                ErrorType.DatabaseError, "User not found in database", 404, err
            );
        }
        return getResponsibleError(err);
    });
}


/**
 * Creates a user and returns the created user
 * 
 * @param {string} [userEmail] The email for the user
 * @param {string} [passwordHash] The hashed password from the user
 * @param {typedefs.UserContext} [Context] Context for the user
 * @param {AWS DynamoDB.DocumentClient} [dynamo] Client for accessing dynamodb
 * 
 * @throws {typedefs.DynamoError} Any dynamodb error creating the user
 * @returns {typedefs.FrontendUser|undefined} The user created, undefined if the user fails to be created
 */
async function createUser(userEmail: string, passwordHash: string, Context: BaseContext, dynamo: DynamoDBDocumentClient): Promise<ResultOrError<CoreUser>> {
    const newPasswordSalt = httpUtils.getRandomString(40);
    const backendUser: DatabaseUser = {
        PKCombined: userEmail,
        SKCombined: "M#",
        Context: Context,
        Temporal: Date.now(),
        PasswordInfo: {
            StoredHash: httpUtils.hashSalted(passwordHash, newPasswordSalt, constants.DEFAULT_HASH_FUNCTION),
            HashFunction: constants.DEFAULT_HASH_FUNCTION,
            Salt: newPasswordSalt
        }
    }
    // console.log("Creating user: ", JSON.stringify(backendUser, null, 2))

    const putCommand: PutCommand = new PutCommand({
        TableName: constants.TABLE_NAME,
        Item: backendUser,
        ConditionExpression: 'attribute_not_exists(PKCombined) OR attribute_not_exists(SKCombined)',
    })

     return await dynamo.send(putCommand)
        .then( _output => getCoreUser(backendUser))
        .catch((err: unknown) => {
            if (isAWSError(err) && err.name == 'ConditionalCheckFailedException' ) {
                return createResponsibleError(ErrorType.DatabaseError, "User with provided email already exists", 409, err)
            } else {
                return getResponsibleError(err);
            }
        });
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
async function updateUser(userEmail: string, changes: UserUpdate, dynamo: DynamoDBDocumentClient): Promise<ResultOrError<CoreUser>>{
    // For updates to email or psw, we need to re-encrypt all encryptedData,
    // invalidate all sessions, and change user password hash and email
    if (!changes.Context && !changes.Email && !changes.PasswordHash) {
        return createResponsibleError(ErrorType.ClientRequestError, "No user updates given in request", 400)
    }

    let user: CoreUser;
    if (changes.Context) {
        // Update user Context
        // Request: {$Context variables to update}
        
        const updatedContext = changes.Context;
        if (!Object.keys(updatedContext).length) {
            return createResponsibleError(ErrorType.ClientRequestError, "No items to update in Context", 400)
        } 
        
        let updateExpression = "SET";
        const expressionAttributeNames = {
            "#Context": "Context"
        };
        const expressionAttributeValues = {};
        
        for (const key in updatedContext) {
            updateExpression = `${updateExpression} #Context.#${key} = :${key}Value,`;
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:${key}Value`] = updatedContext[key];
        }
        updateExpression = updateExpression.slice(0, -1);

        const updateCommandInput: UpdateCommandInput = {
            TableName: constants.TABLE_NAME,
            Key: {
                PKCombined: userEmail,
                SKCombined: "M#"
            },
            UpdateExpression: updateExpression,
            ExpressionAttributeNames: expressionAttributeNames,
            ExpressionAttributeValues: expressionAttributeValues,
            ReturnValues: "ALL_NEW",
        }
        const updateCommand = new UpdateCommand(updateCommandInput)
        const dynamoResult: UpdateCommandOutput = await dynamo.send(updateCommand);

        user = getCoreUser(dynamoResult.Attributes as unknown as DatabaseUser);
    }



    if (changes.Email && changes.Email != userEmail) {
        // Update user email
        // Delete session
        // Create new user, freeze old user, copy vault over to new user
        
        // We change email in the next session.
        // Most of the steps are the same, so we don't repeat most steps twice
        throw new Error("Changing email or password is not yet implemented");

    } else if (changes.PasswordHash) {
        // NOTE: If we change the email, we automatically change the password hash,
        // so don't do this step if email has already changed

        // 1. Update user metadata
        // a. Lock user
        // b. Delete sessions
        // 3. Go through each key and move current encrypted data to Context field, add new encrypted data field in its place
        // 4. Update user's PasswordInfo file
        // 5. Go through each key and delete old encrypted data from Context field

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