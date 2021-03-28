const crypto = require('crypto');

import * as constants from "../utils/constants";
import * as httpUtils from "../utils/httpUtils";
import * as sessions from "../db_access/sessionAccess";
import userAccess from "../db_access/userAccess";

async function routeRequest(routes, body, authorizer, dynamo) {
    let userEmailAuthorized;
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
            let createdUser = userAccess.createUser(
                userSubmission.email,
                userSubmission.passwordHash,
                userSubmission.context,
                dynamo
            );
            
            if (createdUser !== undefined) {
                return constants.OK_MODEL
            } else {
                return httpUtils.getErrorResponseObject(err.message, 409);
            }
        
        case 'update':
            let request = JSON.parse(body);
            return userAccess.updateUser(routes[1], userEmailAuthorized, request);
        
        case 'refreshSession':
            // Download the session key
            let sessionId = authorizer.sessionId;
            return sessions.getSession(userEmail, sessionId, dynamo);

        case 'login':
            // Create a session
            // Return session key in set-cookie header.
            // Return email in set-cookie header
            // Login should include a session length in seconds and session name
            // If session sends 0 for session length,
            //     do a session cookie but still validate it for 30 days
            let request = JSON.parse(body);

            let sessionCookies;
            let sessionName;
            let sessionId = getRandomString(32);
            let expirationDate;

            if (request.sessionLength == 0) {
                // Use browser session. Validate for 30 days
                let expirationTimeout = constants.MAX_SESSION_LENGTH_SECONDS;
                let expirationSeconds = Math.floor(
                    (new Date()).getTime() / 1000 + expirationTimeout
                );
                expirationDate = new Date(expirationSeconds);

                sessionCookies = [
                    httpUtils.getCookieString(constants.SESSION_COOKIE_NAME, sessionId),
                    httpUtils.getCookieString(constants.EMAIL_COOKIE_NAME, userEmailAuthorized)
                ];
                sessionName = "TEMPORARY";

            } else {
                let expirationSeconds = Math.min(
                    constants.MAX_SESSION_LENGTH_SECONDS, 
                    request.sessionLength
                );
                let expirationSeconds = Math.floor(
                    (new Date()).getTime() / 1000 + expirationSeconds
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

            await sessions.createSession(
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

export default { 
    handleUserRequest
};