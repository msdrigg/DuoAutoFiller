import * as sessions from "./layers/db_access/sessionAccess";
import * as httpUtils from "./layers/utils/httpUtils";
import * as constants from "./layers/utils/constants";

const typedefs = require("./layers/utils/typedefs");

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, _context) => {
    // Authorize session based off session existing, and session cookie header

    let emailEncoded = httpUtils.getCookieValue(event.cookies);
    let sessionId = httpUtils.getCookieValue(event.cookies, constants.SESSION_COOKIE_NAME);

    if (emailEncoded === undefined || sessionId === undefined) {
        return httpUtils.getJSONAuthorization(false);
    }

    let email = httpUtils.decodeUnicode(emailEncoded);

    let session;
    try {
        session = await sessions.getSession(email, sessionId, dynamo);
    } catch (err) {
        if (err.retryable) {
            session = await sessions.getSession(email, sessoinId, dynamo);
        } else {
            throw err;
        }
    }

    if (session !== undefined) {
        let expiration = Date.parse(session.temporal);
        if (expiration < Date.now()) {
            try {
                await sessions.deleteSession(email, sessionId);
            } catch (/** @type {typedefs.DynamoError} */ err) {
                if (err.retryable) {
                    await sessions.deleteSession(email, sessionId);
                }
            }
            return httpUtils.getJSONAuthorization(false);
        } else {
            return httpUtils.getJSONAuthorization(true, userEmail);
        }
    } else {
        return httpUtils.getJSONAuthorization(false);
    }
}