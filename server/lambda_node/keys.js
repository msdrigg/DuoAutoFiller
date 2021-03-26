import * as constants from "./constants";
import * as httpUtils from "./httpUtils";

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
                let backendKey = getBackendKey(frontendKey, userEmailAuthorized);
                
                if (!'useCounter' in backendKey) {
                    backendKey.useCounter = 0
                }
                
                let result = await dynamo.put({
                    TableName: constants.TABLE_NAME,
                    Item: backendKey
                }).promise()

                return OK_MODEL
                break;
            
            case 'findSinceTimestamp':
                // Find all keys (batch) since a timestamp. If not provided, find all
                let timestamp = JSON.parse(event.body).timestamp;
                let dynamoParams = {
                    TableName: contstants.TABLE_NAME,
                    IndexName: constants.INDEX_NAME,
                    KeyConditionExpression: 'PKCombined = :hkey and RangeKey > :rkey',
                    ExpressionAttributeValues: {
                        ':hkey': userEmailAuthorized,
                        ':rkey': Date.parse(timestamp).toISOString()
                    }
                }
                let items = await dynamo.scan(dynamoParams).promise().Items;
                return items.map(element => getFrontentKey(element))
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
        return getErrorResponseObject(err.message, 400);
    } 
}

function getBackendKey(frontendKey, userEmail) {
    return {
        encryptedData: frontendKey.encryptedData,
        PKCombined: userEmail,
        SKCombined: "K#" + frontendKey.id,
        context: frontendKey.context,
        temporal: new Date().toISOString(),
        useCounter: frontendKey.useCounter
    }
}

function getFrontentKey(backendKey) {
    return {
        encryptedData: backendKey.encryptedData,
        id: backendKey.SKCombined.slice(2),
        context: backendKey.context,
        lastContentUpdate: backendKey.temporal,
        useCounter: backendKey.useCounter
    }
}

module.exports = { handleKeyRequest };