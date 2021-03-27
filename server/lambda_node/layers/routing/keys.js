import * as constants from "../utils/constants";
import * as httpUtils from "../utils/httpUtils";
import * as keyAccess from "../db_access/keyAccess";

async function handleKeyRequest(routes, event, context, dynamo) {
    // frontendKey: {
    //     "id": "string",
    //     "encryptedData": "b64",
    //     "context": {...},
    //     "lastContentUpdate": "20213002t...",
    //     "useCounter": 0
    // }
    // backendKey: {
    //     "PKCombined": "email",
    //     "SKCombined": "K#$id",
    //     "encryptedData": $encryptedData
    //     "context": $context,
    //     "temporal": $lastContentUpdate,
    //     "useCounter": $useCounter
    // }
    let route;
    if (routes.length == 0) {
        route = "";
    } else {
        route = routes[0];
    }

    try {
        let userEmailAuthorized = context.authorizer.userEmail;

        switch (route) {
            case '':
                // Posting (updating or adding a key
                let frontendKey = JSON.parse(event.body);
                let backendKey = keyAccess.getBackendKey(frontendKey, userEmailAuthorized);
                
                if (!'useCounter' in backendKey) {
                    backendKey.useCounter = 0
                }
                
                let result = await dynamo.put({
                    TableName: constants.TABLE_NAME,
                    Item: backendKey
                }).promise()

                return constants.OK_MODEL
                break;
            
            case 'findSinceTimestamp':
                // Find all keys (batch) since a timestamp. If not provided, find all
                let timestamp = JSON.parse(event.body).timestamp;
                let expressionAttributeValues = {
                    ':hkey': userEmailAuthorized,
                }
                if (timestamp !== undefined) {
                    expressionAttributeValues[':rkey'] = Date.parse(timestamp).toISOString()
                }
                let dynamoParams = {
                    TableName: contstants.TABLE_NAME,
                    IndexName: constants.INDEX_NAME,
                    KeyConditionExpression: 'PKCombined = :hkey and RangeKey > :rkey',
                    ExpressionAttributeValues: expressionAttributeValues
                }
                let items = await dynamo.scan(dynamoParams).promise().Items;
                return items.map(element => keyAccess.getFrontentKey(element))
                break;
            
            case 'downloadAndUse':
                // Increment usageCounter and return the key atomically
                let frontendKey = JSON.parse(event.body);
                let keyId = frontendKey.id;
                result = await dynamo.updateI
                body = await dynamo.update({
                    TableName: constants.TABLE_NAME,
                    Key: {
                        PKCombined: userEmailAuthorized,
                        SKCombined: "K#" + keyId
                    },
                    UpdateExpression: "set useCounter = useCounter + :incr",
                    ExpressionAttributeNames: {
                        ':incr': 1
                    },
                    ReturnValues: "ALL_NEW",
                }).promise();
                break;

            default:
                throw new Error(`Unsupported path key/"${route}"`);
        }
    } catch (err) {
        return httpUtils.getErrorResponseObject(err.message, 400);
    } 
}


export default {
    handleKeyRequest
};