import httpUtils from "../utils/httpUtils";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import userAccess from "../repository/userAccess";

const config: DynamoDBClientConfig = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
      accessKeyId: "xxxxxx",
      secretAccessKey: "xxxxxx"
    }
}
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient(config));

exports.handler = async (event, _context) => {
    // Authorize user based off Authorization cookie with email (b64) and password
    const authorization = event.headers.Authorization;
    let authString;
    if (authorization !== undefined) {
        authString = httpUtils.decodeUnicode(authorization.split(" ")[1]);
    } else {
        return httpUtils.getJSONAuthorization(false, undefined);
    }

    const authParts = authString.split(":");

    if (authParts.length != 2) {
        return httpUtils.getJSONAuthorization(false, undefined);
    }

    const userEmail = authParts[0];
    const userPasswordPreHashed = authParts[1];

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
    const passwordSalt = user.passwordInfo.salt;
    const hashFunction = user.passwordInfo.hashFunction;

    const userPasswordHashed = httpUtils.hashSalted(userPasswordPreHashed, passwordSalt, hashFunction);
    const isAuthenticated = userPasswordHashed == user.passwordInfo.storedHash;

    return httpUtils.getJSONAuthorization(isAuthenticated, userEmail);
}
