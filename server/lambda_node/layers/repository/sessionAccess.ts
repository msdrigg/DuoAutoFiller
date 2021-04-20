import { DeleteCommand, DeleteCommandInput, DynamoDBDocumentClient, GetCommand, GetCommandInput, PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import * as constants from "../utils/constants";
import httpUtils from "../utils/httpUtils";
import { DatabaseSession } from "./model/models";
import { getFrontendSession } from "./model/mapping";
import { ResultOrError } from "../model/common";

/**
 * Gets a session cooresponding to this userEmail and sessionId. Dynamo is the constructor injected dynamoDB Client
 * 
 * @param {string} userEmail
 * @param {string} sessionId
 * @param {AWS.DynamoDB.DocumentClient} [dynamo] Client for accessing dynamodb
 * 
 * @returns {FrontendSession|undefined} The session matching the id and email provided, undefined if not found
 */
async function getSession(
    userEmail: string,
    sessionId: string,
    dynamo: DynamoDBDocumentClient
): Promise<ResultOrError<FrontendSession | undefined>> {
    //! Returns undefined if session is not found in database, returns the session otherwise
    let session: DatabaseSession;
    try {
        let commandInput: GetCommandInput = {
            TableName: constants.TABLE_NAME,
            Key: {
                PKCombined: userEmail,
                SKCombined: "S#" + sessionId
            }
        }
        session = (await dynamo.send(new GetCommand(commandInput))).Item as DatabaseSession;
    } catch(err) {
        if (err.code == "ResourceNotFound") {
            session = undefined;
        } else {
            return {
                statusCode: 500,
                reason: err,
                message: "Error deleting session"
            }
        }
    }

    if (session === undefined) return undefined;

    return getFrontendSession(session);
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
 * @param {DynamoDBDocumentClient} [dynamo] Client for accessing dynamodb
 * 
 * @throws {Error} Any dynamodb error other than ResourceNotFound
 * @returns {FrontendSession} The session matching the id and email provided
 */
async function createSession(
    userEmail: string,
    sessionId: string,
    sessionName: string,
    expirationDate: Date,
    dynamo: DynamoDBDocumentClient
): Promise<ResultOrError<FrontendSession>> {
    let sessionKey = httpUtils.getRandomString(64);
    let sessionObject: DatabaseSession = {
        PKCombined: userEmail,
        SKCombined: "S#" + sessionId,
        Key: sessionKey,
        Context: {
            Name: sessionName
        },
        Temporal: expirationDate.getTime()
    };
    let comandInput: PutCommandInput = {
        TableName: constants.TABLE_NAME,
        Item: sessionObject
    }
    try {
        await dynamo.send(
            new PutCommand(comandInput)
        );
    } catch (err) {
        return {
            message: "Error creating session",
            reason: err,
            statusCode: 500
        }
    }
    
    return getFrontendSession(sessionObject);
}

/**
 * Deletes a session from the database given the email and session id
 * Dynamo is the constructor injected dynamoDB Client
 * 
 * No parameters are validated. Validation occurs at an earlier stage
 * 
 * @param {string} userEmail
 * @param {string} sessionId
 * @param {DynamoDBDocumentClient} [dynamo] Client for accessing dynamodb
 * 
 * @throws {Error} Any dynamodb error other than ResourceNotFound
 */
async function deleteSession(
    userEmail: string,
    sessionId: string,
    dynamo: DynamoDBDocumentClient
): Promise<ResultOrError<void>> {
    let commandInput: DeleteCommandInput = {
        TableName: constants.TABLE_NAME,
        Key: {
            PKCombined: userEmail,
            SKCombined: "S#" + sessionId,
        }
    };
    try {
        await dynamo.send(new DeleteCommand(commandInput));
    } catch (err) {
        return {
            reason: err,
            message: "Error deleting session",
            statusCode: 500
        }
    }
}

export default {
    createSession, 
    getSession,
    deleteSession,
};
