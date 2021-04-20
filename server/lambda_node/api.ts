import * as users from "./layers/routing/users";
import * as keys from "./layers/routing/keys";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb";
import { AuthorizationContext } from "./layers/authorization/types";
import { APIGatewayRequestEvent, LambdaContext, LambdaResponse } from "./layers/utils/AWSTypes";

const config: DynamoDBClientConfig = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
      accessKeyId: "xxxxxx",
      secretAccessKey: "xxxxxx"
    }
}
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient(config));

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
exports.handler = async (event: APIGatewayRequestEvent, context: LambdaContext): Promise<LambdaResponse> => {
    const pathParts = event.rawPath.split('/').slice(1);
    const remainingPathParts = pathParts.slice(1);

    const body = event.body;
    const authorizer: AuthorizationContext = context.authorizer;

    try {
        switch (pathParts[0]) {
            case 'key':
                return await keys.routeRequest(remainingPathParts, body, authorizer, dynamo);

            case 'user':
                return await users.routeRequest(remainingPathParts, body, authorizer, dynamo);

            default:
                throw new Error(`Unsupported path "${pathParts[0]}"`);
        }
    } catch (err) {
        const errorResponse = err;
        errorResponse.alternateStatusCode = err.statusCode;
        errorResponse.statusCode = 400;
        return errorResponse;
    }
};
