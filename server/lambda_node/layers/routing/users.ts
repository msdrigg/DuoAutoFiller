import crypto = require('crypto');

import * as constants from "../utils/constants";
import httpUtils from "../utils/httpUtils";
import sessionAccess, * as sessions from "../repository/sessionAccess";
import userAccess from "../repository/userAccess";
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { LambdaResponse } from './types';
import { isError } from '../model/common';

export async function routeRequest(routes: Array<string>, body: string, authorizer: { userEmail: string; sessionId: string; }, dynamo: DynamoDBDocumentClient): Promise<LambdaResponse> {
    let userEmailAuthorized: string;

    if (routes[0] == "signin") {
        userEmailAuthorized = undefined;
    } else {
        userEmailAuthorized = authorizer.userEmail;
    }

    let primaryRoute = routes[0];

    switch (primaryRoute) {
        case 'signup':
            // Creating a user
            let userSubmission = JSON.parse(body);
            let result = userAccess.createUser(
                userSubmission.Email,
                userSubmission.PasswordHash,
                userSubmission.Context,
                dynamo
            );
            
            if (isError(result)) {
                return result;
            } else if (result === undefined) {
                return constants.OK_MODEL;
            } else {
                return {
                    message: "Error adding user to database with conflict",
                    statusCode: 409
                };
            }
        
        case 'update':
            let input = JSON.parse(body);
            return userAccess.updateUser(userEmailAuthorized, input, dynamo);
        
        case 'refreshSession':
            // Download the session key
            return sessionAccess.getSession(userEmailAuthorized, authorizer.sessionId, dynamo);

        case 'login':
            // Create a session
            // Return session key in set-cookie header.
            // Return email in set-cookie header
            // Login should include a session length in seconds and session name
            // If session sends 0 for session length,
            //     do a session cookie but still validate it for 30 days
            let request = JSON.parse(body);

            let sessionCookies: Array<string>;
            let sessionName: string;
            let sessionId = httpUtils.getRandomString(32);
            let expirationDate: Date;

            if (request.sessionLength == 0) {
                // Use browser session. Validate for 30 days
                let expirationTimeout = constants.MAX_SESSION_LENGTH_SECONDS;
                let expirationSeconds = Math.floor(
                    (new Date()).getTime() / 1000 + expirationTimeout
                );
                expirationDate = new Date(expirationSeconds);

                sessionCookies = [
                    httpUtils.getCookieString(constants.SESSION_COOKIE_NAME, sessionId, expirationDate),
                    httpUtils.getCookieString(constants.EMAIL_COOKIE_NAME, userEmailAuthorized, expirationDate)
                ];
                sessionName = "TEMPORARY";

            } else {
                let expirationTimeoutSeconds = Math.min(
                    constants.MAX_SESSION_LENGTH_SECONDS, 
                    request.sessionLength
                );
                let expirationSeconds = Math.floor(
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
                statusCode: 200,
                cookies: sessionCookies,
                body: constants.OK_MODEL
            }

        default:
            throw new Error(`Unsupported path /user/"${routes.join("/")}"`);
    }
}