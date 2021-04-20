import * as constants from "../utils/constants";
import keyAccess from "../db_access/keyAccess";
import { LambdaResponse } from "./types";
import { AuthorizationContext } from "../authorization/types";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { ResultOrError, ErrorResponse, isError } from "../model/common";
import { FrontendKey } from "../model/keys";

export async function routeRequest(routes: Array<string>, body: string, authorizer: AuthorizationContext, dynamo: DynamoDBDocumentClient): Promise<LambdaResponse> {
    // Route users requests 
    let route: string = "";
    if (routes.length > 0) {
        route = routes[0];
    }

    try {
        let userEmailAuthorized = authorizer.userEmail;

        switch (route) {
            case '':
                // Posting (updating or adding a key
                let frontendKey = JSON.parse(body);

                let response: ResultOrError<FrontendKey> = await keyAccess.createKey(userEmailAuthorized, frontendKey,  dynamo);
                if (isError(response)) {
                    return response
                }
                return constants.OK_MODEL
            
            case 'findSinceTimestamp':
                // Find all keys (batch) since a timestamp. If not provided, find all
                let timestamp = JSON.parse(body).timestamp;

                let dateTime = timestamp && Date.parse(timestamp) || timestamp
                
                return keyAccess.getKeysSinceTime(userEmailAuthorized, dateTime, dynamo);
            
            case 'downloadAndUse':
                // Increment usageCounter and return the key atomically
                let requestBody = JSON.parse(body);
                let keyId = requestBody.id;
                
                return keyAccess.getAndIncrement(userEmailAuthorized, keyId, dynamo);

            default:
                throw new Error(`Unsupported path /key/"${route}"`);
        }
    } catch (err) {
        return {
            message: err.message,
            reason: err,
            statusCode: 400
        }
    } 
}
