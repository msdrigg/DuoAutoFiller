import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    UpdateCommand,
    UpdateCommandInput,
    UpdateCommandOutput
} from "@aws-sdk/lib-dynamodb";
import { CoreUser, UserAuthVerifier, UserUpdate, PasswordInfo } from ".";
import { createDatabaseUser, getCoreUser } from "./mapping";
import {
    ResultOrError,
    BaseContext,
    DatabaseRow,
    isError,
    constants,
    createResponsibleError,
    ErrorType,
    isAWSError,
    getResponsibleError,
    getResponsibleUnknownError
} from "../common";
import { UserAuthExternal } from "./model";

/**
 * Key respository for testing purposes
 */
export interface IUserRepository {
    getUser(
        userEmail: string,
    ): Promise<ResultOrError<CoreUser>>
    getAuthUser(
        userEmail: string,
    ): Promise<ResultOrError<UserAuthVerifier>>
    createUser(
        user: UserAuthExternal
    ): Promise<ResultOrError<CoreUser>>
    updateUser(
        userEmail: string,
        changes: UserUpdate
    ): Promise<ResultOrError<CoreUser>>
    deleteUser(
        userEmail: string,
    ): Promise<ResultOrError<void>>
}

export type DatabaseUser = DatabaseRow & {
    PasswordInfo: PasswordInfo,
    Context: BaseContext,
    Temporal: number
}

/**
 * Repository in class structure to store keys
 */
export class UserRepository implements IUserRepository {
    dynamo: DynamoDBDocumentClient;
    constructor (dynamo: DynamoDBDocumentClient) {
        this.dynamo = dynamo;
    }

    /**
     * Gets the user metadata cooresponding to this userEmail and sessionId.
     * 
     * @param {string} [userEmail] The email for the user
     * @param {DocumentClient} [dynamo] Client for accessing dynamo
     * 
     * @throws {AWSError} Any dynamo error other than ResourceNotFound
     * @returns {CoreUser|undefined} The user 
     */
    async getUser(userEmail: string): Promise<ResultOrError<CoreUser>> {
        return this.getAuthUser(userEmail).then(result => {
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

    async getAuthUser(userEmail: string): Promise<ResultOrError<UserAuthVerifier>> {
        // Function to get user given the email, and return the user (undefined if no user exists)
        const params: GetCommand = new GetCommand( {
            TableName: constants.TABLE_NAME,
            Key: {
                PKCombined: userEmail,
                SKCombined: "M#"
            }
        });
        return await this.dynamo.send(params).then( result => {
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
            if (isAWSError(err)) {
                return getResponsibleError(err);
            } else {
                return getResponsibleUnknownError(err)
            }
        });
    }


    /**
     * Creates a user and returns the created user
     * 
     * @param {string} [userEmail] The email for the user
     * @param {string} [passwordHash] The hashed password from the user
     * @param {typedefs.UserContext} [Context] Context for the user
     * @param {AWS DynamoDB.DocumentClient} [dynamo] Client for accessing dynamo
     * 
     * @throws {typedefs.DynamoError} Any dynamo error creating the user
     * @returns {typedefs.FrontendUser|undefined} The user created, undefined if the user fails to be created
     */
    async createUser(user: UserAuthExternal): Promise<ResultOrError<CoreUser>> {
        const backendUser = createDatabaseUser(user)

        const putCommand: PutCommand = new PutCommand({
            TableName: constants.TABLE_NAME,
            Item: backendUser,
            ConditionExpression: 'attribute_not_exists(PKCombined) OR attribute_not_exists(SKCombined)',
        })

        return await this.dynamo.send(putCommand)
            .then( _output => getCoreUser(backendUser))
            .catch((err: unknown) => {
                if (isAWSError(err) && err.name == 'ConditionalCheckFailedException' ) {
                    return createResponsibleError(ErrorType.DatabaseError, "User with provided email already exists", 409, err)
                } else {
                    if (isAWSError(err)) {
                        return getResponsibleError(err);
                    } else {
                        return getResponsibleUnknownError(err)
                    }
                }
            });
    }

    /**
     * Updates a user and returns the new user
     * 
     * @param {string} [userEmail] The email for the user
     * @param {typedefs.UserUpdater} [changes] This field contains the changes matching the requested field
     * @param {AWS DynamoDB.DocumentClient} [dynamo] Client for accessing dynamo
     * 
     * @throws {typedefs.DynamoError} Any dynamo error creating the user
     * @returns {typedefs.FrontendUser|typedefs.ErrorResponse} The user updated, or an error if there was no supplied changes
     */
    async updateUser(userEmail: string, changes: UserUpdate): Promise<ResultOrError<CoreUser>>{
        // For updates to email or psw, we need to re-encrypt all encryptedData,
        // invalidate all sessions, and change user password hash and email
        if (!changes.Context && !changes.Email && !changes.PasswordInput) {
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
            const dynamoResult: UpdateCommandOutput = await this.dynamo.send(updateCommand);

            user = getCoreUser(dynamoResult.Attributes as unknown as DatabaseUser);
        }



        if (changes.Email && changes.Email != userEmail) {
            // Update user email
            // Delete session
            // Create new user, freeze old user, copy vault over to new user
            
            // We change email in the next session.
            // Most of the steps are the same, so we don't repeat most steps twice
            throw new Error("Changing email or password is not yet implemented");

        } else if (changes.PasswordInput) {
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

    /**
     * Gets the user metadata cooresponding to this userEmail and sessionId.
     * 
     * @param {string} [userEmail] The email for the user
     * @param {DocumentClient} [dynamo] Client for accessing dynamo
     * 
     * @throws {AWSError} Any dynamo error other than ResourceNotFound
     * @returns {CoreUser|undefined} The user 
     */
    async deleteUser(userEmail: string): Promise<ResultOrError<void>> {
        throw Error(`Not yet implemented: and to stop warnings heres user email ${userEmail}`);
    }

}