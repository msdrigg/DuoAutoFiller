import {
    DeleteCommand,
    DeleteCommandInput,
    DynamoDBDocumentClient,
    GetCommand,
    GetCommandInput,
    PutCommand,
    PutCommandInput
} from "@aws-sdk/lib-dynamodb";
import { getFrontendSession } from "./mapping";
import { CoreSession, SessionContext } from ".";
import {
    ResultOrError,
    DatabaseRow,
    constants,
    createResponsibleError,
    ErrorType,
    isAWSError,
    getResponsibleError,
    httpUtils
} from "../common";

/**
 * Session repository interface
 */
export interface ISessionRepository {
    getSession(
        userEmail: string,
        sessionId: string
    ): Promise<ResultOrError<CoreSession>>
    createSession(
        userEmail: string,
        sessionId: string,
        sessionName: string,
        expirationDate: Date
    ): Promise<ResultOrError<CoreSession>>
    deleteSession(
        userEmail: string,
        sessionId: string
    ): Promise<ResultOrError<void>>
}

export type DatabaseSession = DatabaseRow & {
    Key: string,
    Context: SessionContext,
    Temporal: number
}

/**
 * Repository in class structure to store sessions
 */
export class SessionRepository implements ISessionRepository {
    dynamo: DynamoDBDocumentClient;
    constructor (dynamo: DynamoDBDocumentClient) {
        this.dynamo = dynamo;
    }

    /**
     * Gets a session cooresponding to this userEmail and sessionId. Dynamo is the constructor injected dynamoDB Client
     * 
     * @param {string} userEmail
     * @param {string} sessionId
     * @param {AWS.DynamoDB.DocumentClient} [dynamo] Client for accessing dynamo
     * 
     * @returns {CoreSession|undefined} The session matching the id and email provided, undefined if not found
     */
    async getSession(
        userEmail: string,
        sessionId: string,
    ): Promise<ResultOrError<CoreSession>> {
        //! Returns undefined if session is not found in database, returns the session otherwise
        const commandInput: GetCommandInput = {
            TableName: constants.TABLE_NAME,
            Key: {
                PKCombined: userEmail,
                SKCombined: "S#" + sessionId
            }
        }
        return await this.dynamo.send(new GetCommand(commandInput))
            .then(result => {
                if (result.Item === undefined) {
                    return createResponsibleError(
                        ErrorType.DatabaseError,
                        "Session not found matching email and id",
                        404
                    );
                } else {
                    return getFrontendSession(result.Item as DatabaseSession)
                }
            })
            .catch(err => {
                if (isAWSError(err) && err.name == "ResourceNotFound") {
                    return undefined;
                } else {
                    return getResponsibleError(err);
                }
            })
    }

    /**
     * Creates a session cooresponding to the provided parameters. Validate the expirationDate also.
     * Dynamo is the constructor injected dynamoDB Client
     * 
     * No parameters are validated. Validation occurs at an earlier stage
     * 
     * @param {string} userEmail
     * @param {string} sessionId
     * @param {string} sessionName
     * @param {Date} expirationDate
     * 
     * @throws {Error} Any dynamo error other than ResourceNotFound
     * @returns {CoreSession} The session matching the id and email provided
     */
    async createSession(
        userEmail: string,
        sessionId: string,
        sessionName: string,
        expirationDate: Date,
    ): Promise<ResultOrError<CoreSession>> {
        const sessionKey = httpUtils.getRandomString(64);
        const sessionObject: DatabaseSession = {
            PKCombined: userEmail,
            SKCombined: "S#" + sessionId,
            Key: sessionKey,
            Context: {
                Name: sessionName
            },
            Temporal: expirationDate.getTime()
        };
        const comandInput: PutCommandInput = {
            TableName: constants.TABLE_NAME,
            Item: sessionObject
        }
        return this.dynamo.send( new PutCommand(comandInput))
            .then(_result => getFrontendSession(sessionObject))
            .catch(err => getResponsibleError(err));
    }

    /**
     * Deletes a session from the database given the email and session id
     * Dynamo is the constructor injected dynamoDB Client
     * 
     * No parameters are validated. Validation occurs at an earlier stage
     * 
     * @param {string} userEmail
     * @param {string} sessionId
     * @param {DynamoDBDocumentClient} [dynamo] Client for accessing dynamo
     * 
     * @throws {Error} Any dynamo error other than ResourceNotFound
     */
    async deleteSession(
        userEmail: string,
        sessionId: string,
    ): Promise<ResultOrError<void>> {
        const commandInput: DeleteCommandInput = {
            TableName: constants.TABLE_NAME,
            Key: {
                PKCombined: userEmail,
                SKCombined: "S#" + sessionId,
            }
        };
        return this.dynamo.send(new DeleteCommand(commandInput))
            .then(_result => undefined)
            .catch(err => getResponsibleError(err));
   }
}