import * as httpUtils from "./layers/utils/httpUtils";
import getUser from "./layers/db_access/userAccess";

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {
    // Authorize user based off Authorization cookie with email (b64) and password
    let authorization = event.headers.Authorization;
    let authString;
    if (authorization !== undefined) {
        authString = httpUtils.decodeUnicode(authorization.split(" ")[1]);
    } else {
        return getJSONAuthorization(false);
    }

    let authParts = authString.split(":");

    if (authParts.length != 2) {
        return getJSONAuthorization(false);
    }

    let userEmail = authParts[0];
    let userPasswordPreHashed = authParts[1];

    let user;
    try {
        user = await getUser(userEmail, dynamo);
    } catch (err) {
        if (err.retryable) {
            user = await getUser(userEmail, dynamo);
        } else {
            throw err;
        }
    }

    if (user === undefined) {
        return getJSONAuthorization(false);
    }
    let passwordSalt = user.passwordInfo.salt;
    let hashFunction = user.passwordInfo.hashFunction;

    let userPasswordHashed = httpUtils.hashSalted(userPasswordPreHashed, passwordSalt, hashFunction);
    let isAuthenticated = userPasswordHashed == user.passwordInfo.storedHash;

    return httpUtils.getJSONAuthorization(isAuthenticated, userEmail);
}
