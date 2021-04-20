import { DeleteCommand, DeleteCommandInput, DynamoDBDocumentClient, GetCommand, GetCommandInput, PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import * as constants from "../utils/constants";
import httpUtils from "../utils/httpUtils";
import { DatabaseSession } from "./model/models";
import { getFrontendSession, getResponsibleError } from "./model/mapping";
import { ResultOrError } from "../model/common";
import { FrontendSession } from "../model/sessions"
import { isAWSError } from "./model/errors";

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
    const commandInput: GetCommandInput = {
        TableName: constants.TABLE_NAME,
        Key: {
            PKCombined: userEmail,
            SKCombined: "S#" + sessionId
        }
    }
    return await dynamo.send(new GetCommand(commandInput))
        .then(result => {
            if (result.Item === undefined) {
                return undefined;
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
    return dynamo.send( new PutCommand(comandInput))
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
 * @param {DynamoDBDocumentClient} [dynamo] Client for accessing dynamodb
 * 
 * @throws {Error} Any dynamodb error other than ResourceNotFound
 */
async function deleteSession(
    userEmail: string,
    sessionId: string,
    dynamo: DynamoDBDocumentClient
): Promise<ResultOrError<void>> {
    const commandInput: DeleteCommandInput = {
        TableName: constants.TABLE_NAME,
        Key: {
            PKCombined: userEmail,
            SKCombined: "S#" + sessionId,
        }
    };
    return dynamo.send(new DeleteCommand(commandInput))
        .then(_result => undefined)
        .catch(err => getResponsibleError(err));
}

export default {
    createSession, 
    getSession,
    deleteSession,
};
