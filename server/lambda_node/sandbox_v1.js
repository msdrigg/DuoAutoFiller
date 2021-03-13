const AWS = require('aws-sdk');
const crypto = require('crypto');

const dynamo = new AWS.DynamoDB.DocumentClient();

DEFAULT_HASH_FUNCTION = 'sha512'
EMAIL_COOKIE_NAME = "UserEmail";
OK_MODEL = {"Result": "Success"};
TABLE_NAME = "AutoAuthenticateUnified";
INDEX_NAME = "GSITemporal";

/**
 * Demonstrates a simple HTTP endpoint using API Gateway. You have full
 * access to the request and response payload, including headers and
 * status code.
 *
 * To scan a DynamoDB table, make a GET request with the TableName as a
 * query string parameter. To put, update, or delete an item, make a POST,
 * PUT, or DELETE request respectively, passing in the payload to the
 * DynamoDB API as a JSON body.
 */

 

exports.handler = async (event, context) => {
    let pathParts = event.rawPath.split('/').slice(1);

    let remainingPathParts;
    if (pathParts.length > 1) {
        remainingPathParts = pathParts.slice(1);
    } else {
        remainingPathParts = []
    }

    try {
        switch (pathParts[0]) {
            case 'key':
                return await handleKeyRequest(remainingPathParts, event);
                break;
            case 'user':
                return await handleUserRequest(remainingPathParts, event);
                break;
            default:
                throw new Error(`Unsupported path "${pathParts[0]}"`);
        }
    } catch (err) {
        return {
            "statusCode": 400,
            "body": {"ErrorMessage": err.message},
        }
    }
};

async function handleKeyRequest(routes, event) {
    // frontendKey: {
    //     "id": "string",
    //     "encryptedData": "b64",
    //     "context": {...},
    //     "lastContentUpdate": "20213002t...",
    //     "useCounter": 0
    // }
    // backendKey: {
    //     "PKCombined": "email",
    //     "SKCombined": "K#$id",
    //     "encryptedData": $encryptedData
    //     "context": $context,
    //     "temporal": $lastContentUpdate,
    //     "useCounter": $useCounter
    // }
    let route;
    if (routes.length == 0) {
        route = "";
    } else {
        route = routes[0];
    }

    try {
        let userEmail = getCookieValue(cookies, EMAIL_COOKIE_NAME);

        switch (route) {
            case '':
                // Posting (updating or adding a key
                let frontendKey = JSON.parse(event.body);
                let backendKey = getBackendKey(frontendKey, userEmail);
                
                if (!'useCounter' in backendKey) {
                    backendKey.useCounter = 0
                }
                
                let result = await dynamo.put({
                    TableName: TABLE_NAME,
                    Item: backendKey
                }).promise()

                return OK_MODEL
                break;
            
            case 'findSinceTimestamp':
                // Find all keys (batch) since a timestamp. If not provided, find all
                let timestamp = JSON.parse(event.body).timestamp;
                let dynamoParams = {
                    TableName: TABLE_NAME,
                    IndexName: INDEX_NAME,
                    KeyConditionExpression: 'PKCombined = :hkey and RangeKey > :rkey',
                    ExpressionAttributeValues: {
                        ':hkey': userEmail,
                        ':rkey': Date.parse(timestamp).toISOString()
                    }
                }
                let items = await dynamo.scan(dynamoParams).promise().Items;
                return items.map(element => getFrontentKey(element))
                break;
            
            case 'downloadAndUse':
                // Increment usageCounter and return the key atomically
                let frontendKey = JSON.parse(event.body);
                let keyId = frontendKey.id;
                result = await dynamo.updateI
                body = await dynamo.update({
                    TableName: TABLE_NAME,
                    Key: {
                        PKCombined: userEmail,
                        SKCombined: "K#" + keyId
                    },
                    UpdateExpression: "set useCounter = useCounter + :incr",
                    ExpressionAttributeNames: {
                        ':incr': 1
                    },
                    ReturnValues: "ALL_NEW",
                }).promise();
                break;

            default:
                throw new Error(`Unsupported path key/"${route}"`);
        }
    } catch (err) {
        return {
            "statusCode": 400,
            "body": {"ErrorMessage": err.message},
        }
    } 
}

function getBackendKey(frontendKey, userEmail) {
    return {
        encryptedData: frontendKey.encryptedData,
        PKCombined: userEmail,
        SKCombined: "K#" + frontendKey.id,
        context: frontendKey.context,
        temporal: new Date().toISOString(),
        useCounter: frontendKey.useCounter
    }
}

function getFrontentKey(backendKey) {
    return {
        encryptedData: backendKey.encryptedData,
        id: backendKey.SKCombined.slice(2),
        context: backendKey.context,
        lastContentUpdate: backendKey.temporal,
        useCounter: backendKey.useCounter
    }
}

function decodeUnicode(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

function encodeUnicode(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
    }));
  }

async function handleUserRequest(routes, event) {
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
        let userEmailFromCookie;
        if (routes[0] == "signin") {
            userEmailFromCookie = undefined;
        } else {
            userEmailFromCookie = getCookieValue(event.cookies, EMAIL_COOKIE_NAME);
        }
        let primaryRoute = routes[0];
        switch (primaryRoute) {
            case 'signup':
                // Creating a user

                let userSubmission = JSON.parse(event.body);

                let newPasswordSalt = crypto.randomBytes(100).toString('hex');
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
                    let result = await dynamo.put({
                        TableName: TABLE_NAME,
                        Item: backendKey
                    }).promise()
                    return OK_MODEL
                } catch (err) {
                    if (err.name == 'ConditionalCheckFailedException' ) {
                        return {
                            "statusCode": 409,
                            "body": {"ErrorMessage": err.message},
                        }
                    } else {
                        throw err
                    }
                }
                break;
            
            case 'update':
                switch (routes[1]) {
                    // For updates, we need to re-encrypt all encryptedData, invalidate all sessions, and change user password hash and email
                    case 'email':
                        break;
                    case 'password':
                        break;
                    case 'context':

                        break;
                    default:
                        throw new Error(`Unexpected route ${routes.join('/')}`);
                }
                // Find all keys (batch) since a timestamp. If not provided, find all
                let timestamp = JSON.parse(event.body).timestamp;
                let dynamoParams = {
                    TableName: TABLE_NAME,
                    IndexName: INDEX_NAME,
                    KeyConditionExpression: 'PKCombined = :hkey and RangeKey > :rkey',
                    ExpressionAttributeValues: {
                        ':hkey': userEmailFromCookie,
                        ':rkey': Date.parse(timestamp).toISOString()
                    }
                }
                let items = await dynamo.scan(dynamoParams).promise().Items;
                return items.map(element => getFrontentKey(element))
                break;
            
            case 'downloadAndUse':
                // Increment usageCounter and return the key atomically
                let frontendKey = JSON.parse(event.body);
                let keyId = frontendKey.id;
                result = await dynamo.updateI
                body = await dynamo.update({
                    TableName: TABLE_NAME,
                    Key: {
                        PKCombined: userEmailFromCookie,
                        SKCombined: "K#" + keyId
                    },
                    UpdateExpression: "set useCounter = useCounter + :incr",
                    ExpressionAttributeNames: {
                        ':incr': 1
                    },
                    ReturnValues: "ALL_NEW",
                }).promise();
                break;

            default:
                throw new Error(`Unsupported path key/"${route}"`);
        }
    } catch (err) {
        return {
            "statusCode": 400,
            "body": {"ErrorMessage": err.message},
        }
    } 
}
    // {
    //     "cookies" : ["cookie1", "cookie2"],
    //     "isBase64Encoded": true|false,
    //     "statusCode": httpStatusCode,
    //     "headers": { "headerName": "headerValue", ... },
    //     "body": "Hello from Lambda!"
    // }

function getCookieValue(cookies, cookieName) {
    let emailCookie = cookies.find(cookie => cookie.startsWith(cookieName));
    if (emailCookie === undefined) {
        return "";
    } else {
        let cookieSplit = emailCookie.split(";")[0].split("=");

        if (cookieSplit.length > 1 && cookieSplit[1]) {
            return decodeUnicode(cookieSplit[1]);
        } else {
            return "";
        }
    }
}

function hashSalted(password, salt, hashFunction) {
    var hash = crypto.createHmac(hashFunction, salt); /** Hashing algorithm sha512 */
    hash.update(password);
    return hash.digest('hex');
}