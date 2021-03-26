const crypto = require('crypto');

import * as constants from "./constants";
import * as httpUtils from "./httpUtils";
import * as sessions from "./sessions";

DEFAULT_HASH_FUNCTION = 'sha512';
EMAIL_COOKIE_NAME = "UserEmail";
SESSION_COOKIE_NAME = "SessionID";

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

                let newPasswordSalt = getRandomString(40);
                let backendUser = {
                    PKCombined: userSubmission.email,
                    SKCombined: "M#",
                    context: userSubmission.context,
                    temporal = new Date().toISOString,
                    passwordInfo: {
                        storedHash: hashSalted(userSubmission.passwordHash, DEFAULT_HASH_FUNCTION),
                        hashFunction: DEFAULT_HASH_FUNCTION,
                        salt: newPasswordSalt
                    }
                }

                let dynamoParams = {
                    TableName: TABLE_NAME,
                    Item: backendUser,
                    ConditionExpression: 'PKCombined <> :userEmail',
                    ExpressionAttriuteValues: {
                        ':userEmail': backendUser.PKCombined
                    },
                    ReturnValues: "ALL_NEW"
                }
                
                try {
                    await dynamo.put({
                        TableName: TABLE_NAME,
                        Item: backendKey
                    }).promise()
                    return OK_MODEL
                } catch (err) {
                    if (err.name == 'ConditionalCheckFailedException' ) {
                        return getErrorResponseObject(err.message, 409);
                    } else {
                        throw err
                    }
                }
                break;
            
            case 'update':
                let request = JSON.parse(event.body);
                return await updateUser(routes[1], userEmailAuthorized, request);
                break;
            
            case 'refreshSession':
                // Download the session key
                let sessionId = context.authorizer.sessionId;
                return sessions.getSession(userEmail, sessionId, dynamo);
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
                    let expirationSeconds = MAX_SESSION_LENGTH_SECONDS;
                    expirationUTC = Math.floor(
                        (new Date()).getTime() / 1000 + expirationSeconds
                    );
                    sessionCookies = [
                        httpUtils.getCookieString(SESSION_COOKIE_NAME, sessionId),
                        httpUtils.getCookieString(EMAIL_COOKIE_NAME, userEmailAuthorized)
                    ];
                    sessionName = "TEMPORARY";
                } else {
                    let expirationSeconds = Math.min(
                        sessions.MAX_SESSION_LENGTH_SECONDS, 
                        request.sessionLength
                    );
                    let expirationUTCSeconds = Math.floor(
                        (new Date()).getTime() / 1000 + expirationSeconds
                    );
                    sessionCookies = [
                        httpUtils.getCookieString(
                            SESSION_COOKIE_NAME, 
                            sessionId, 
                            new Date(expirationUTC)
                        ),
                        httpUtils.getCookieString(
                            EMAIL_COOKIE_NAME,
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

async function updateUser(route, userEmail, request) {
    switch (route) {
        // For updates to email or psw, we need to re-encrypt all encryptedData,
        // invalidate all sessions, and change user password hash and email
        case 'context':
            // Request: {$context variables to update}
            let updatedContext = Object.keys(request)
                .filter(key => UPDATEABLE_USER_METADATA.includes(key))
                .reduce((obj, key) => {
                    obj[key] = request[key];
                    return obj;
                }, {});
            
            if (!Object.keys(updatedContext).length) {
                return OK_MODEL;
            } 
            
            let updateExpression = "SET";
            let expressionAttributeNames = {
                "#context": "context"
            };
            let expressionAttributeValues = {};
            
            for (key of updatedContext) {
                updateExpression = `${updateExpression} #context.#${key} = :${key}Value,`;
                expressionAttributeNames[`#${key}`] = key;
                expressionAttributeValues[`:${key}Value`] = updatedContext[key];
            }
            updateExpression = updateExpression.slice(1);
            dynamo.update({
                TableName: TABLE_NAME,
                Key: {
                    PKCombined: userEmailAuthorized,
                    SKCombined: "M#"
                },
                UpdateExpression=updateExpression,
                ExpressionAttributeNames=expressionAttributeNames,
                ExpressionAttributeValues=expressionAttributeValues
            });
        break;

        case 'email':
            // We change email in the next session.
            // Most of the steps are the same, so we don't repeat most steps twice
        case 'password':
            // We need to delete all session keys
            // Request: {
            //     newEmail: $email,
            //     newPassword: $hashedPassword,
            //     updatedKeys: [
            //         {$keyJSON}...
            //     ]
            // }
            // Steps: 
            //  CLIENT: Logs out user
            //  0. CAN WE SOMEHOW THROW OUT TTL ON LAMBDA SESSION AUTHENTICATION
            //  1. Invalidate user. (user: Locked parameter to user metadata) And download to get current key version
            //  2. Delete all sessions (batches of 25, retrying errors, exponential backoff)
            //  2o. If we are changing user, create new user with proper metadata and lock on
            //  3. Download all keys in batches of 25?50?
            //      modify them to include new encrypted data, and new email, or new key version
            //      move up lastContentUpdate to NOW
            //  4. Upload all keys to their new places (with or without new email, and WITH NEW IDS, WITH KEY INDICATORS)
            //      delete old versions in the update itself (transaction)
            //      batches of 5
            //  5. Revalidate user (new if new email, old if not new email)
            //  5o. If we are changing email, delete entire old user
            //  IF WE FAIL DURING STEP (After 2 retries of operation). Always retry lock revert 5x
            //       (then open async lambda to revert it if failure occurs) Finally return failure to user
            //  1. No additional work needed
            //  2. No additional work needed
            //  2o Also attempt to delete user?
            //  3. No additional work needed
            //  4. Return failure including which keys aren't working and open aschronous lambda to fix. 
            //      When future logins download the keys with old key versions, client will attempt fix WITHOUT throwing out current 
            //      version of key if it is downloaded. Request user to re-input old password if old password isn't saved
            //      Any future useAndUpdate this key should include re-encrypted key, so we can update it from that
            //  5. Open aschronous lambda mandating that it gets fixed. 
            //  We also need to check user lock on login. If the lock exists, something has failed. We need to ask them to 
            //  Enter their old email or password (depending on which has changed), and we can re-start the migration
            throw new Error("Changing email or password is not yet implemented");

            break;

        default:
            throw new Error(`Unexpected route ${routes.join('/')}`);
    }
}

function hashSalted(password, salt, hashFunction) {
    var hash = crypto.createHmac(hashFunction, salt); /** Hashing algorithm sha512 */
    hash.update(password);
    return hash.digest('hex');
}

module.exports = { handleUserRequest };