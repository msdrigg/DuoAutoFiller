import * as constants from "utils/constants";
import * as httpUtils from "../utils/httpUtils";

const typedefs = require("../utils/typedefs");


/**
 * Gets a session cooresponding to this userEmail and sessionId. Dynamo is the constructor injected dynamoDB Client
 * 
 * @param {string} userEmail
 * @param {string} sessionId
 * @param {AWS.DynamoDB.DocumentClient} [dynamo] Client for accessing dynamodb
 * 
 * @throws {typedefs.DynamoError} Any dynamodb error other than ResourceNotFound
 * @returns {typedefs.FrontendSession|undefined} The session matching the id and email provided, undefined if not found
 */
async function getSession(userEmail, sessionId, dynamo) {
    //! Returns undefined if session is not found in database, returns the session otherwise
    let session;
    try {
        session = await dynamo.get({
            TableName: constants.TABLE_NAME,
            Key: {
                PKCombined: userEmail,
                SKCombined: "S#" + sessionId
            }
        }).promise();
    } catch(err) {
        if (err.code == "ResourceNotFound") {
            return undefined;
        }
        throw err;
    }

    return {
        key: session.key,
        id: sessionId,
        context: session.context,
        expiration: Date.parse(session.temporal)
    };
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
 * @param {AWS.DynamoDB.DocumentClient} [dynamo] Client for accessing dynamodb
 * 
 * @throws {typedefs.DynamoError} Any dynamodb error other than ResourceNotFound
 * @returns {typedefs.FrontendSession} The session matching the id and email provided
 */
async function createSession(userEmail, sessionId, sessionName, expirationDate, dynamo) {
    let sessionKey = httpUtils.getRandomString(64);
    let sessionObject = {
        PKCombined: userEmail,
        SKCombined: "S#" + sessionId,
        key: sessionKey,
        context: {
            name: sessionName
        },
        temporal: expirationDate.toISOString()
    };
    await dynamo.put({
        TableName: TABLE_NAME,
        Item: sessionObject
    }).promise();
    
    return {
        key: sessionKey,
        id: sessionId,
        expiration: expirationDate,
        context: {
            name: sessionName
        }
    };
}

/**
 * Deletes a session from the database given the email and session id
 * Dynamo is the constructor injected dynamoDB Client
 * 
 * No parameters are validated. Validation occurs at an earlier stage
 * 
 * @param {string} userEmail
 * @param {string} sessionId
 * @param {AWS.DynamoDB.DocumentClient} [dynamo] Client for accessing dynamodb
 * 
 * @throws {typedefs.DynamoError} Any dynamodb error other than ResourceNotFound
 */
async function deleteSession(userEmail, sessionId, dynamo) {
    await dynamo.delete({
        TableName: TABLE_NAME,
        Key: {
            PKCombined: userEmail,
            SKCombined: "S#" + sessionId,
        }
    }).promise();
}

export default {
    createSession, 
    getSession,
    deleteSession,
};
