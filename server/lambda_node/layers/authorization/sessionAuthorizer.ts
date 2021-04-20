import sessionAccess from "../db_access/sessionAccess";
import httpUtils from "../utils/httpUtils";
import constants from "../utils/constants";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let config: DynamoDBClientConfig = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
      accessKeyId: "xxxxxx",
      secretAccessKey: "xxxxxx"
    }
}
let dynamo = DynamoDBDocumentClient.from(new DynamoDBClient(config));

exports.handler = async (event, _context) => {
    // Authorize session based off session existing, and session cookie header

    let emailEncoded = httpUtils.getCookieValue(event.cookies, constants.EMAIL_COOKIE_NAME);
    let sessionId = httpUtils.getCookieValue(event.cookies, constants.SESSION_COOKIE_NAME);

    if (emailEncoded === undefined || sessionId === undefined) {
        return httpUtils.getJSONAuthorization(false, undefined);
    }

    let email = httpUtils.decodeUnicode(emailEncoded);

    let session;
    try {
        session = await sessionAccess.getSession(email, sessionId, dynamo);
    } catch (err) {
        if (err.retryable) {
            session = await sessionAccess.getSession(email, sessionId, dynamo);
        } else {
            throw err;
        }
    }

    if (session !== undefined) {
        let expiration = Date.parse(session.temporal);
        if (expiration < Date.now()) {
            try {
                await sessionAccess.deleteSession(email, sessionId, dynamo);
            } catch (/** @type {typedefs.DynamoError} */ err) {
                if (err.retryable) {
                    await sessionAccess.deleteSession(email, sessionId, dynamo);
                }
            }
            return httpUtils.getJSONAuthorization(false, undefined);
        } else {
            return httpUtils.getJSONAuthorization(true, email);
        }
    } else {
        return httpUtils.getJSONAuthorization(false, undefined);
    }
}