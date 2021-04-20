import httpUtils from "../utils/httpUtils";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import userAccess from "../repository/userAccess";

let config: DynamoDBClientConfig = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
      accessKeyId: "xxxxxx",
      secretAccessKey: "xxxxxx"
    }
}
let dynamo = DynamoDBDocumentClient.from(new DynamoDBClient(config));

exports.handler = async (event, context) => {
    // Authorize user based off Authorization cookie with email (b64) and password
    let authorization = event.headers.Authorization;
    let authString;
    if (authorization !== undefined) {
        authString = httpUtils.decodeUnicode(authorization.split(" ")[1]);
    } else {
        return httpUtils.getJSONAuthorization(false, undefined);
    }

    let authParts = authString.split(":");

    if (authParts.length != 2) {
        return httpUtils.getJSONAuthorization(false, undefined);
    }

    let userEmail = authParts[0];
    let userPasswordPreHashed = authParts[1];

    let user;
    try {
        user = await userAccess.getUser(userEmail, dynamo);
    } catch (err) {
        if (err.retryable) {
            user = await userAccess.getUser(userEmail, dynamo);
        } else {
            throw err;
        }
    }

    if (user === undefined) {
        return httpUtils.getJSONAuthorization(false, undefined);
    }
    let passwordSalt = user.passwordInfo.salt;
    let hashFunction = user.passwordInfo.hashFunction;

    let userPasswordHashed = httpUtils.hashSalted(userPasswordPreHashed, passwordSalt, hashFunction);
    let isAuthenticated = userPasswordHashed == user.passwordInfo.storedHash;

    return httpUtils.getJSONAuthorization(isAuthenticated, userEmail);
}
