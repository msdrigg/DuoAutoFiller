import keyAccess from "../repository/keyAccess";
import { getErrorLambdaResponse, LambdaResponse } from "../utils/AWSTypes";
import { AuthorizationContext } from "../authorization/types";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ErrorType, isError, ResponsibleError, ResultOrError } from "../model/common";
import { FrontendKey } from "../model/keys";
import { createResponsibleError } from "../repository/model/mapping";

export async function routeRequest(routes: Array<string>, body: string, authorizer: AuthorizationContext, dynamo: DynamoDBDocumentClient): Promise<LambdaResponse> {
    // Route users requests 
    let route = "";
    if (routes.length > 0) {
        route = routes[0];
    }

    try {
        const userEmailAuthorized = authorizer.userEmail;

        switch (route) {
            case '': {
                // Posting (updating or adding a key
                const frontendKey = JSON.parse(body);
                const response: ResultOrError<FrontendKey> = await keyAccess.createKey(userEmailAuthorized, frontendKey,  dynamo);
                if (isError(response)) {
                    return getErrorLambdaResponse(response);
                } else {
                    return response;
                }
            }
            case 'findSinceTimestamp': {
                // Find all keys (batch) since a timestamp. If not provided, find all
                const timestamp = JSON.parse(body).timestamp;

                const dateTime = timestamp && Date.parse(timestamp) || timestamp
                
                const response = await keyAccess.getKeysSinceTime(userEmailAuthorized, dateTime, dynamo);
                if (isError(response)) {
                    return getErrorLambdaResponse(response);
                } else {
                    return response as FrontendKey[];
                }
            }
            case 'downloadAndUse': {
                // Increment usageCounter and return the key atomically
                const requestBody = JSON.parse(body);
                const keyId = requestBody.id;
                
                const result = await keyAccess.getAndIncrement(userEmailAuthorized, keyId, dynamo);
                if (isError(result)) {
                    return getErrorLambdaResponse(result);
                } else {
                    return result;
                }
            }
            default: {
                throw new Error(`Unsupported path /key/"${route}"`);
            }
        }
    } catch (err) {
        let responsibleError: ResponsibleError;
        if (err !== undefined) {
            responsibleError = createResponsibleError(ErrorType.ServerError, err?.message || "Unknown error", 400, err);
        } else {
            responsibleError = createResponsibleError(ErrorType.UnknownError, "Unknown error routing request", 500)
        }
        return getErrorLambdaResponse(responsibleError);
    } 
}
