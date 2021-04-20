import { DynamoDBDocumentClient, PutCommand, QueryCommand, QueryCommandInput, PutCommandInput, UpdateCommandInput, UpdateCommand, DeleteCommandInput, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ResultOrError } from "../model/common";
import { getDatabaseKey, getFrontendKey, getResponsibleError } from "./model/mapping";
import { DatabaseKey } from "./model/models";
import constants from "../utils/constants";
import { FrontendKey, KeyContext } from "../model/keys";


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
async function createKey(
    userEmail: string,
    frontendKey: FrontendKey,
    dynamodb: DynamoDBDocumentClient
): Promise<ResultOrError<FrontendKey>> {
    const databaseKey: DatabaseKey = getDatabaseKey(userEmail, frontendKey);
    const commandInput: PutCommandInput = {
        TableName: constants.TABLE_NAME,
        Item: databaseKey
    }
    return await dynamodb.send(new PutCommand(commandInput))
        .then(_result => frontendKey)
        .catch(err => getResponsibleError(err));
}


/**
 * Returns keys as a list given conditions
 * 
 * @param {string} [userEmail] Authorized users email
 * @param {Date=} [cuttoffDate] Only return keys that have content updates after this date
 * @param {AWS.DynamoDB.DocumentClient} [dynamo] client for accessing dynamodb 
 * 
 * @returns {List<typedefs.FrontendKey>} The keys matching the criterion
 */
async function getKeysSinceTime(
    userEmail: string,
    cuttoffDate: Date | undefined,
    dynamo: DynamoDBDocumentClient
): Promise<ResultOrError<Array<FrontendKey>>> {
    const expressionAttributeValues = {
        ':hkey': userEmail,
        ":keyFilter": "K#"
    }
    const filterExpression = 'begins_with (SKCombined, :keyFilter)'
    let keyConditionExpression = 'PKCombined = :hkey'
    if (cuttoffDate !== undefined) {
        expressionAttributeValues[':rkey'] = cuttoffDate.getTime();
        keyConditionExpression = `${keyConditionExpression} and Temporal > :rkey`;
    }

    const dynamoParams: QueryCommandInput = {
        TableName: constants.TABLE_NAME,
        IndexName: constants.INDEX_NAME,
        Limit: 1000,
        Select: "ALL_ATTRIBUTES",
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        KeyConditionExpression: keyConditionExpression
    }

    return await dynamo.send(new QueryCommand(dynamoParams))
        .then(output =>  output.Items.map(item => getFrontendKey(item as DatabaseKey)))
        .catch(err => getResponsibleError(err));
}

/**
 * Increments usageCounter and returns the updated key
 * 
 * @param {string} [userEmail] Authorized users email
 * @param {string} [keyId] The key to access
 * @param {DynamoDBDocumentClient} [dynamo] client for accessing dynamodb 
 * 
 * @throws {DynamoError} any dynamodb error creating the user
 * @returns {FrontendKey} The keys matching the criterion
 */
async function getAndIncrement(
    userEmail: string,
    keyId: string,
    dynamo: DynamoDBDocumentClient
): Promise<ResultOrError<FrontendKey>> {
    const updateCommandInput: UpdateCommandInput = {
        TableName: constants.TABLE_NAME,
        Key: {
            PKCombined: userEmail,
            SKCombined: "K#" + keyId
        },
        UpdateExpression: "SET UseCounter = if_not_exists(UseCounter, :zero_counter) + :incr",
        ExpressionAttributeValues: {
            ':incr': 1,
            ':zero_counter': 0
        },
        ReturnValues: "ALL_NEW",
    }

    return await dynamo.send(new UpdateCommand(updateCommandInput))
        .then(result => getFrontendKey(result.Attributes as DatabaseKey))
        .catch(err => getResponsibleError(err));
}

async function deleteKey(
    userEmail: string,
    keyId: string,
    dynamodb: DynamoDBDocumentClient
): Promise<ResultOrError<void>> {
    const commandInput: DeleteCommandInput = {
        TableName: constants.TABLE_NAME,
        Key: {
            PKCombined: userEmail,
            SKCombined: "K#" + keyId
        }
    }

    return await dynamodb.send(new DeleteCommand(commandInput))
        .then(_result => undefined)
        .catch(err => getResponsibleError(err));
}

async function updateKeyContext(
    userEmail: string,
    keyId: string,
    updatedContext: KeyContext,
    dynamodb: DynamoDBDocumentClient
): Promise<ResultOrError<FrontendKey>> {
    let updateExpression = "SET";
    const expressionAttributeNames = {
        "#Temporal": "Temporal"
    };
    const expressionAttributeValues = {};
    
    for (const key in updatedContext) {
        updateExpression = `${updateExpression} #Context.#${key} = :${key}Value,`;
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeNames["#Context"] = "Context";
        expressionAttributeValues[`:${key}Value`] = updatedContext[key];
    }

    updateExpression = `${updateExpression} #Temporal = :TemporalValue`
    expressionAttributeValues[":TemporalValue"] = Date.now();

    const updateCommand = new UpdateCommand({
        TableName: constants.TABLE_NAME,
        Key: {
            PKCombined: userEmail,
            SKCombined: "K#" + keyId
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: "ALL_NEW",
    })

    return await dynamodb.send(updateCommand)
        .then(result => getFrontendKey(result.Attributes as DatabaseKey))
        .catch(err => getResponsibleError(err))
}

export default {
    createKey,
    getAndIncrement,
    getKeysSinceTime,
    deleteKey,
    updateKeyContext,
};