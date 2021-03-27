const crypto = require('crypto');

import * as constants from "../utils/constants";
import * as httpUtils from "../utils/httpUtils";
import * as sessions from "../db_access/sessionAccess";
import userAccess from "../db_access/userAccess";


UPDATEABLE_USER_METADATA = [
    'phone',
    'emailBackup'
];
TRACKED_USER_METADATA [
    "phone",
    "emailBackup", 
    "dateJoined"
];

async function handleUserRequest(routes, event, context, dynamo) {
    // frontEndSession {
    //     "cookie": {
    //         "email": "b64email",
    //         "sessionId": "b64sessionid"
    //     }
    //     "sessionKey": "b64Key",
    //     "name": "givenName",
    //     "expiration": "iso6801Date"
    // }
    // backendsession {
    //     "pkcombined": "email",
    //     "skcombined": "S#$cookie.b64sessionid",
    //     "sessionkey": $sessionKey
    //     "context": {"name": $name}
    //     "temporal": $expiration
    // }
    // frontenduser: {
    //     "email": "email@example.com",
    //     "hashedPassword": PBKDF(user, psw),
    //     "context": {"key": "value"},
    // }
    // backenduser: {
    //     "pkcombined": $email,
    //     "skcombined": "M#",
    //     "passwordInfo": {
    //            "storedHash": HASH(SALT($hashedPassword)),
    //            "hashFunction": "functionId",
    //            "salt": "b64RandomData"
    //     }
    //     "context": $context,
    //     "temporal": $lastContentUpdate,
    // }
    try {
        let userEmailAuthorized;
        if (routes[0] == "signin") {
            userEmailAuthorized = undefined;
        } else {
            userEmailAuthorized = context.authorizer.userEmail;
        }
        let primaryRoute = routes[0];
        switch (primaryRoute) {
            case 'signup':
                // Creating a user
                let userSubmission = JSON.parse(event.body);
                let createdUser;
                try {
                    createdUser = userAccess.createUser(
                        userSubmission.email,
                        userSubmission.passwordHash,
                        userSubmission.context,
                        dynamo
                    );
                } catch (err) {
                    if (err.retryable) {
                        createdUser = userAccess.createUser(
                            userSubmission.email,
                            userSubmission.passwordHash,
                            userSubmission.context,
                            dynamo
                        );
                    } else {
                        throw err
                    }
                }
                if (createdUser !== undefined) {
                    return constants.OK_MODEL
                } else {
                    return httpUtils.getErrorResponseObject(err.message, 409);
                }
                break;
            
            case 'update':
                let request = JSON.parse(event.body);
                try {
                    return userAccess.updateUser(routes[1], userEmailAuthorized, request);
                } catch (err) {
                    if (err.retryable) {
                        return userAccess.updateUser(routes[1], userEmailAuthorized, request);
                    } else {
                        throw err;
                    }
                }
                break;
            
            case 'refreshSession':
                // Download the session key
                let sessionId = context.authorizer.sessionId;
                try {
                    return sessions.getSession(userEmail, sessionId, dynamo);
                } catch (err) {
                    if (err.retryable) {
                        return sessions.getSession(userEmail, sessionId, dynamo);
                    } else {
                        throw err;
                    }
                }
                break;

            case 'login':
                // Create a session
                // Return session key in set-cookie header.
                // Return email in set-cookie header
                // Login should include a session length in seconds and session name
                // If session sends 0 for session length,
                //     do a session cookie but still validate it for 30 days
                let request = JSON.parse(event.body);

                let sessionCookies;
                let sessionName;
                let sessionId = getRandomString(32);
                let expirationDate;

                if (request.sessionLength == 0) {
                    // Use browser session. Validate for 30 days
                    let expirationSeconds = constants.MAX_SESSION_LENGTH_SECONDS;
                    expirationUTC = Math.floor(
                        (new Date()).getTime() / 1000 + expirationSeconds
                    );
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
                    let expirationUTCSeconds = Math.floor(
                        (new Date()).getTime() / 1000 + expirationSeconds
                    );
                    sessionCookies = [
                        httpUtils.getCookieString(
                            constants.SESSION_COOKIE_NAME, 
                            sessionId, 
                            new Date(expirationUTC)
                        ),
                        httpUtils.getCookieString(
                            constants.EMAIL_COOKIE_NAME,
                            userEmailAuthorized,
                            new Date(expirationUTC)
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
                break;

            default:
                throw new Error(`Unsupported path /user/"${routes.join("/")}"`);
        }
    } catch (err) {
        return getErrorResponseObject(err.message, 400);
    } 
}

export default { 
    handleUserRequest
};