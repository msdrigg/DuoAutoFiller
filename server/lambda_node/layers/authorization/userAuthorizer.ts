import httpUtils from "../utils/httpUtils";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getAuthUser } from "../repository/userAccess";
import { APIGatewayRequestEvent, LambdaContext } from "../utils/AWSTypes";
import { LambdaAuthorization } from "./types";
import { isError } from "../model/common";
import { UserAuthChallenge } from "../model/users";

const config: DynamoDBClientConfig = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
      accessKeyId: "xxxxxx",
      secretAccessKey: "xxxxxx"
    }
}
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient(config));

exports.handler = async (event: APIGatewayRequestEvent, _context: LambdaContext): Promise<LambdaAuthorization> => {
    // Authorize user based off Authorization cookie with email (b64) and password
    const authorization = event.headers.Authorization;
    let authString: string;
    if (authorization !== undefined) {
        authString = httpUtils.decodeUnicode(authorization.split(" ")[1]);
    } else {
        return httpUtils.getJSONAuthorization(false, undefined);
    }

    const authParts = authString.split(":");

    if (authParts.length != 2) {
        return {
            isAuthorized: false
        }
    }

    const userEmail = authParts[0];
    const userPasswordInput = authParts[1];

    return authorizeUser({
        Email: userEmail,
        PasswordInput: userPasswordInput
    }, dynamo);
}

export async function authorizeUser(userInput: UserAuthChallenge, dynamo: DynamoDBDocumentClient): Promise<LambdaAuthorization> {
    return await getAuthUser(userInput.Email, dynamo).then( async result => {
        // If we have retryable error, retry once immediately
        if (isError(result) && result.isRetryable) {
            return await getAuthUser(userInput.Email, dynamo);
        } else {
            return result;
        }
    }).then (result => {
        if (isError(result)) {
            // Don't authorize on error
            return {
                isAuthorized: false
            }
        } else {
            // Check user salt
            const passwordSalt: string = result.PasswordInfo.Salt;
            const hashFunction: string = result.PasswordInfo.HashFunction;

            const userPasswordHashed: string = httpUtils.hashSalted(userInput.PasswordInput, passwordSalt, hashFunction);
            const isAuthenticated: boolean = userPasswordHashed == result.PasswordInfo.StoredHash;

            if (isAuthenticated) {
                return {
                    isAuthorized: true,
                    context: {
                        userEmail: userInput.Email
                    }
                }
            } else {
                return {isAuthorized: false}
            }
        }
    })
}