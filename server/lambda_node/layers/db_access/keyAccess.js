import * as constants from ("../utils/constants");

const typedefs = require("../utils/typedefs");


/**
 * Creates a key and returns the created key
 * 
 * @param {typedefs.FrontendKey} [frontendKey] The key to add
 * @param {string} [useremail] The email to associate the key with
 * @param {AWS.DynamoDB.DocumentClient} [dynamo] client for accessing dynamodb 
 *  
 * @throws {typedefs.DynamoError} any dynamodb error creating the user
 * @returns {typedefs.FrontendKey} the user created, undefined if the user fails to be created
 */
async function createKey(frontendKey, userEmail) {
    let backendKey = keyAccess.getBackendKey(frontendKey, userEmail);
    
    let result = await dynamo.put({
        TableName: constants.TABLE_NAME,
        Item: backendKey
    }).promise()

    return result.Attributes
}


/**
 * Returns keys as a list given conditions
 * 
 * @param {string} [userEmail] Authorized users email
 * @param {Date=} [cuttoffDate] Only return keys that have content updates after this date
 * @param {AWS.DynamoDB.DocumentClient} [dynamo] client for accessing dynamodb 
 * 
 * @throws {typedefs.DynamoError} any dynamodb error creating the user
 * @returns {List<typedefs.FrontendKey>} The keys matching the criterion
 */
async function getKeysSinceTime(userEmail, cuttoffDate, dynamo) {
    let expressionAttributeValues = {
        ':hkey': userEmail,
    }
    if (cuttoffDate !== undefined) {
        expressionAttributeValues[':rkey'] = cuttoffDate.toISOString()
    }
    let dynamoParams = {
        TableName: constants.TABLE_NAME,
        IndexName: constants.INDEX_NAME,
        KeyConditionExpression: 'PKCombined = :hkey and RangeKey > :rkey',
        ExpressionAttributeValues: expressionAttributeValues
    }
    let items = await dynamo.scan(dynamoParams).promise().Items;
    return items.map(element => getFrontentKey(element))
}

/**
 * Increments usageCounter and returns the updated key
 * 
 * @param {string} [userEmail] Authorized users email
 * @param {string} [keyId] The key to access
 * @param {AWS.DynamoDB.DocumentClient} [dynamo] client for accessing dynamodb 
 * 
 * @throws {typedefs.DynamoError} any dynamodb error creating the user
 * @returns {typedefs.FrontendKey} The keys matching the criterion
 */
async function getAndIncrement(userEmail, keyId, dynamo) {
    let body = await dynamo.update({
        TableName: constants.TABLE_NAME,
        Key: {
            PKCombined: userEmail,
            SKCombined: "K#" + keyId
        },
        UpdateExpression: "set useCounter = useCounter + :incr",
        ExpressionAttributeNames: {
            ':incr': 1
        },
        ReturnValues: "ALL_NEW",
    }).promise();

    return getFrontendKey(body.Attributes);
}

/**
 * Gets the backend key given the frontend key
 * 
 * @param {typedefs.FrontendKey} [frontendKey] The frontend key
 * @param {string} userEmail
 * 
 * @returns {typedefs.DatabaseKey} The user created, undefined if the user fails to be created
 */
function getBackendKey(frontendKey, userEmail) {
    return {
        encryptedData: frontendKey.encryptedData,
        PKCombined: userEmail,
        SKCombined: "K#" + frontendKey.id,
        context: frontendKey.context,
        temporal: new Date().toISOString(),
        useCounter: frontendKey.useCounter
    };
}

/**
 * Gets the frontend key given the backend key
 * 
 * @param {typedefs.DatabaseKey} [backendKey] The email for the user
 * 
 * @returns {typedefs.FrontendKey} The user created, undefined if the user fails to be created
 */
function getFrontentKey(backendKey) {
    return {
        encryptedData: backendKey.encryptedData,
        id: backendKey.SKCombined.slice(2),
        context: backendKey.context,
        lastContentUpdate: backendKey.temporal,
        useCounter: backendKey.useCounter
    };
}

export default {
    getBackendKey,
    getFrontentKey,
    createKey,
    getKeysSinceTime,
};