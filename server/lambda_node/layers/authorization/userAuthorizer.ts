import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayRequestEvent, LambdaContext, httpUtils, isError } from "../common";
import { UserRepository, IUserRepository } from "../users";
import { LambdaAuthorization } from "./model";


export async function authorizeUser(authorization: string, userRepository: IUserRepository): Promise<LambdaAuthorization> {
    let authString: string;
    if (authorization !== undefined) {
        // TODO: Validate incoming authorization headers
        authString = httpUtils.decodeUnicode(authorization.split(" ")[1]);
    } else {
        return {
            isAuthorized: false
        }
    }

    const authParts = authString.split(":");

    if (authParts.length != 2) {
        return {
            isAuthorized: false
        }
    }

    const userEmail = authParts[0];
    const userPasswordInput = authParts[1];

    return await userRepository.getAuthUser(userEmail).then( async result => {
        // If we have retryable error, retry once immediately
        if (isError(result) && result.isRetryable) {
            return await userRepository.getAuthUser(userEmail);
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

            const userPasswordHashed: string = httpUtils.hashSalted(userPasswordInput, passwordSalt, hashFunction);
            const isAuthenticated: boolean = userPasswordHashed == result.PasswordInfo.StoredHash;

            if (isAuthenticated) {
                return {
                    isAuthorized: true,
                    context: {
                        userEmail: userEmail
                    }
                }
            } else {
                return {isAuthorized: false}
            }
        }
    })
}

const config: DynamoDBClientConfig = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
      accessKeyId: "xxxxxx",
      secretAccessKey: "xxxxxx"
    }
}
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient(config));
const userRepository = new UserRepository(dynamo);

exports.handler = async (event: APIGatewayRequestEvent, _context: LambdaContext): Promise<LambdaAuthorization> => {
    // Authorize user based off Authorization cookie with email (b64) and password
    return authorizeUser(event.headers.Authorization, userRepository);
}