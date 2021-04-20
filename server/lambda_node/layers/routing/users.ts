import * as constants from "../utils/constants";
import httpUtils from "../utils/httpUtils";
import sessionAccess from "../repository/sessionAccess";
import userAccess from "../repository/userAccess";
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { getErrorLambdaResponse, LambdaResponse } from '../utils/AWSTypes';
import { ErrorType, isError, ResultOrError } from '../model/common';
import { AuthorizationContext, isSessionAuthorizationContext } from "../authorization/types";
import { createResponsibleError } from "../repository/model/mapping";
import { FrontendSession } from "../model/sessions";

export async function routeRequest(routes: Array<string>, body: string, authorizer: AuthorizationContext, dynamo: DynamoDBDocumentClient): Promise<LambdaResponse> {
    let userEmailAuthorized: string;

    if (routes[0] == "signin") {
        userEmailAuthorized = undefined;
    } else {
        userEmailAuthorized = authorizer.userEmail;
    }

    const primaryRoute = routes[0];

    switch (primaryRoute) {
        case 'signup': {
            // Creating a user
            const userSubmission = JSON.parse(body);
            const result = userAccess.createUser(
                userSubmission.Email,
                userSubmission.PasswordHash,
                userSubmission.Context,
                dynamo
            );
            
            if (isError(result)) {
                return getErrorLambdaResponse(result);
            } else if (result === undefined) {
                return constants.OK_MODEL;
            } else {
                return getErrorLambdaResponse(
                    createResponsibleError(ErrorType.DatabaseError, "Error adding user to database with conflict", 409)
                )
            }
        }
        case 'update': {
            const input = JSON.parse(body);
            const result = await userAccess.updateUser(userEmailAuthorized, input, dynamo);
            if (isError(result)) {
                return getErrorLambdaResponse(result);
            } else {
                return result
            }
        }
        case 'refreshSession': {
            // Download the session key
            let result: ResultOrError<FrontendSession>;
            if (isSessionAuthorizationContext(authorizer)) {
                result = await sessionAccess.getSession(userEmailAuthorized, authorizer.sessionId, dynamo);
            } else {
                result = createResponsibleError(ErrorType.ServerError, "No session provided in session authorizer", 500)
            }
            if (isError(result)) {
                return getErrorLambdaResponse(result);
            } else {
                return result;
            }
        }
        case 'login': {
            // Create a session
            // Return session key in set-cookie header.
            // Return email in set-cookie header
            // Login should include a session length in seconds and session name
            // If session sends 0 for session length,
            //     do a session cookie but still validate it for 30 days
            const request = JSON.parse(body);

            let sessionCookies: Array<string>;
            let sessionName: string;
            const sessionId = httpUtils.getRandomString(32);
            let expirationDate: Date;

            if (request.sessionLength == 0) {
                // Use browser session. Validate for 30 days
                const expirationTimeout = constants.MAX_SESSION_LENGTH_SECONDS;
                const expirationSeconds = Math.floor(
                    (new Date()).getTime() / 1000 + expirationTimeout
                );
                expirationDate = new Date(expirationSeconds);

                sessionCookies = [
                    httpUtils.getCookieString(constants.SESSION_COOKIE_NAME, sessionId, expirationDate),
                    httpUtils.getCookieString(constants.EMAIL_COOKIE_NAME, userEmailAuthorized, expirationDate)
                ];
                sessionName = "TEMPORARY";

            } else {
                const expirationTimeoutSeconds = Math.min(
                    constants.MAX_SESSION_LENGTH_SECONDS, 
                    request.sessionLength
                );
                const expirationSeconds = Math.floor(
                    (new Date()).getTime() / 1000 + expirationTimeoutSeconds
                );
                expirationDate = new Date(expirationSeconds);

                sessionCookies = [
                    httpUtils.getCookieString(
                        constants.SESSION_COOKIE_NAME, 
                        sessionId, 
                        expirationDate
                    ),
                    httpUtils.getCookieString(
                        constants.EMAIL_COOKIE_NAME,
                        userEmailAuthorized,
                        expirationDate
                    )
                ];
                sessionName = request.sessionName;
            }

            await sessionAccess.createSession(
                userEmailAuthorized,
                sessionId,
                sessionName,
                expirationDate,
                dynamo
            )

            return {
                cookies: sessionCookies,
                statusCode: 200,
                body: JSON.stringify(constants.OK_MODEL, null, 2)
            }
        }
        default: {
            throw new Error(`Unsupported path /user/"${routes.join("/")}"`);
        }
    }
}