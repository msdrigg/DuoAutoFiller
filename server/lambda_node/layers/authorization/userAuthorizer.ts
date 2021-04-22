import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayRequestEvent, LambdaContext, httpUtils, isError } from "../common";
import { UserRepository, IUserRepository } from "../users";
import { LambdaAuthorization } from "./model";
import { authorizationHeaderStringValidation, emailValidator, passwordHashValidator } from "./validation";


export async function authorizeUser(userRepository: IUserRepository, authorizationHeader?: string): Promise<LambdaAuthorization> {
    if (authorizationHeader === undefined) {
        return {
            isAuthorized: false
        }
    }
    const validatedHeader = authorizationHeaderStringValidation.validate(authorizationHeader);
    if (validatedHeader.error !== undefined) {
        return {
            isAuthorized: false
        }
    }
    const authString = httpUtils.decodeUnicode(validatedHeader.value.split(" ")[1]);

    const authParts = authString.split(":");

    if (authParts.length != 2) {
        return {
            isAuthorized: false
        }
    }

    const [ userEmailUnvalidated, userPasswordUnvalidated ] = authParts;

    const validatedEmail = emailValidator.validate(userEmailUnvalidated);
    if (validatedEmail.error !== undefined) {
        return {
            isAuthorized: false
        }
    }
    const userEmail = validatedEmail.value as string;

    const validatedPassword = passwordHashValidator.validate(userPasswordUnvalidated);
    if (validatedPassword.error !== undefined) {
        return {
            isAuthorized: false
        }
    }
    const userPasswordInput = validatedPassword.value as string;

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
    return authorizeUser(userRepository, event.headers.Authorization);
}