import sessionAccess from "../repository/sessionAccess";
import httpUtils from "../utils/httpUtils";
import constants from "../utils/constants";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayRequestEvent, LambdaContext } from "../utils/AWSTypes";
import { FrontendSession } from "../model/sessions";
import { isError, ResultOrError } from "../model/common";
import { LambdaAuthorization } from "./types";

const config: DynamoDBClientConfig = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
      accessKeyId: "xxxxxx",
      secretAccessKey: "xxxxxx"
    }
}
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient(config));

exports.handler = async (event: APIGatewayRequestEvent, _context: LambdaContext): Promise<LambdaAuthorization> => {
    // Authorize session based off session existing, and session cookie header

    const emailEncoded = httpUtils.getCookieValue(event.cookies, constants.EMAIL_COOKIE_NAME);
    const sessionId = httpUtils.getCookieValue(event.cookies, constants.SESSION_COOKIE_NAME);

    if (emailEncoded === undefined || sessionId === undefined) {
        // We can't authorize if there isn't any email or session provided
        return {
            isAuthorized: false
        }
    }

    const email = httpUtils.decodeUnicode(emailEncoded);

    return authorizeSession(email, sessionId, dynamo);
}

export async function authorizeSession(email: string, sessionId: string, dynamo: DynamoDBDocumentClient): Promise<LambdaAuthorization> {
    return await sessionAccess.getSession(email, sessionId, dynamo).then( async (result: ResultOrError<FrontendSession>): Promise<ResultOrError<FrontendSession>> => {
            if (isError(result) && result.isRetryable){
                return sessionAccess.getSession(email, sessionId, dynamo)
            } else {
                return result;
            }
        }
    ).then(async result => {
        if (isError(result) || result === undefined) {
            return {
                isAuthorized: false
            }
        } else {
            if (result.Expiration < new Date()) {
                await sessionAccess.deleteSession(email, sessionId, dynamo).catch(err => {
                    if (isError(err) && err.isRetryable) {
                        return sessionAccess.deleteSession(email, sessionId, dynamo).catch(_err=>undefined)
                    } else {
                        return Promise.resolve()
                    }
                })
                return {
                    isAuthorized: false
                }
            } else {
                return {
                    isAuthorized: true, context: {
                        userEmail: email,
                        sessionId: result.Id
                    }
                }
            }
        }
    })
}