import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayRequestEvent, LambdaContext, httpUtils, constants, ResultOrError, isError } from "../common";
import { CoreSession, ISessionRepository, SessionRepository } from "../sessions";
import { LambdaAuthorization } from "./model";


export async function authorizeSession(cookies: Array<string>, sessionRepository: ISessionRepository): Promise<LambdaAuthorization> {
    const emailEncoded = httpUtils.getCookieValue(cookies, constants.EMAIL_COOKIE_NAME);
    const sessionId = httpUtils.getCookieValue(cookies, constants.SESSION_COOKIE_NAME);

    if (emailEncoded === undefined || sessionId === undefined) {
        // We can't authorize if there isn't any email or session provided
        return {
            isAuthorized: false
        }
    }

    const email = httpUtils.decodeUnicode(emailEncoded);

    return await sessionRepository.getSession(email, sessionId).then( async (result: ResultOrError<CoreSession>): Promise<ResultOrError<CoreSession>> => {
            if (isError(result) && result.isRetryable){
                return sessionRepository.getSession(email, sessionId)
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
                await sessionRepository.deleteSession(email, sessionId).catch(err => {
                    if (isError(err) && err.isRetryable) {
                        return sessionRepository.deleteSession(email, sessionId).catch(_err=>undefined)
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

const config: DynamoDBClientConfig = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
      accessKeyId: "xxxxxx",
      secretAccessKey: "xxxxxx"
    }
}
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient(config));
const sessionRepository = new SessionRepository(dynamo);

exports.handler = async (event: APIGatewayRequestEvent, _context: LambdaContext): Promise<LambdaAuthorization> => {
    // Authorize session based off session existing, and session cookie header
    return authorizeSession(event.cookies, sessionRepository);
}