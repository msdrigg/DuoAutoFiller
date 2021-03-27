import * as httpUtils from "./layers/utils/httpUtils";
import * as users from "./layers/routing/users";
import * as keys from "./layers/routing/keys";

const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

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

    let remainingPathParts = pathParts.slice(1);

    try {
        switch (pathParts[0]) {
            case 'key':
                return await keys.handleKeyRequest(remainingPathParts, event, context);

            case 'user':
                return await users.handleUserRequest(remainingPathParts, event, context);

            default:
                throw new Error(`Unsupported path "${pathParts[0]}"`);
        }
    } catch (err) {
        return httpUtils.getErrorResponseObject(err.message, 400);
    }
};
