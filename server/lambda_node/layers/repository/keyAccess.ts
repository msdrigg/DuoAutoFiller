import { DynamoDBDocumentClient, PutCommand, QueryCommand, QueryCommandInput, PutCommandInput, UpdateCommandInput, UpdateCommand, DeleteCommandInput, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ResultOrError } from "../model/common";
import { getDatabaseKey, getFrontendKey } from "./model/mapping";
import { DatabaseKey } from "./model/models";
import constants from "../utils/constants";
import { FrontendKey, KeyContext } from "../model/keys";
import { isAWSError } from "./model/errors";


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
    let databaseKey: DatabaseKey = getDatabaseKey(userEmail, frontendKey);
    let commandInput: PutCommandInput = {
        TableName: constants.TABLE_NAME,
        Item: databaseKey
    }
    try {
        await dynamodb.send(new PutCommand(commandInput));
        return frontendKey;
    } catch (err) {
        return {
            message: "Error adding key to database",
            reason: err,
            statusCode: 500
        }
    }
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
async function getKeysSinceTime(
    userEmail: string,
    cuttoffDate: Date | undefined,
    dynamo: DynamoDBDocumentClient
): Promise<ResultOrError<Array<FrontendKey>>> {
    let expressionAttributeValues = {
        ':hkey': userEmail,
        ":keyFilter": "K#"
    }
    let filterExpression = 'begins_with (SKCombined, :keyFilter)'
    let keyConditionExpression = 'PKCombined = :hkey'
    if (cuttoffDate !== undefined) {
        expressionAttributeValues[':rkey'] = cuttoffDate.getTime();
        keyConditionExpression = `${keyConditionExpression} and Temporal > :rkey`;
    }

    let dynamoParams: QueryCommandInput = {
        TableName: constants.TABLE_NAME,
        IndexName: constants.INDEX_NAME,
        Limit: 1000,
        Select: "ALL_ATTRIBUTES",
        FilterExpression: filterExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        KeyConditionExpression: keyConditionExpression
    }
    try {
        let items: Array<DatabaseKey> = (await dynamo.send(new QueryCommand(dynamoParams))).Items as Array<DatabaseKey>;
        return items.map(element => getFrontendKey(element) as FrontendKey)
    } catch (err) {
        return {
            message: "Error getting keys from the database",
            statusCode: 500,
            reason: err
        }
    }
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
async function getAndIncrement(
    userEmail: string,
    keyId: string,
    dynamo: DynamoDBDocumentClient
): Promise<ResultOrError<FrontendKey>> {
    let updateCommandInput: UpdateCommandInput = {
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

    try {
        let body = await dynamo.send(new UpdateCommand(updateCommandInput));
        return getFrontendKey(body.Attributes as DatabaseKey);
    } catch (err) {
        return {
            message: "Error updating key",
            reason: err,
            statusCode: 500
        };
    }

}

async function deleteKey(
    userEmail: string,
    keyId: string,
    dynamodb: DynamoDBDocumentClient
): Promise<ResultOrError<void>> {
    let commandInput: DeleteCommandInput = {
        TableName: constants.TABLE_NAME,
        Key: {
            PKCombined: userEmail,
            SKCombined: "K#" + keyId
        }
    }
    try {
        await dynamodb.send(new DeleteCommand(commandInput));
        return undefined;
    } catch (err) {
        return {
            message: "Error deleting key from database",
            reason: err,
            statusCode: 500
        }
    }
}

async function updateKeyContext(
    userEmail: string,
    keyId: string,
    updatedContext: KeyContext,
    dynamodb: DynamoDBDocumentClient
): Promise<ResultOrError<FrontendKey>> {
    let updateExpression = "SET";
    let expressionAttributeNames = {
        "#Temporal": "Temporal"
    };
    let expressionAttributeValues = {};
    
    for (const key in updatedContext) {
        updateExpression = `${updateExpression} #Context.#${key} = :${key}Value,`;
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeNames["#Context"] = "Context";
        expressionAttributeValues[`:${key}Value`] = updatedContext[key];
    }

    updateExpression = `${updateExpression} #Temporal = :TemporalValue`
    expressionAttributeValues[":TemporalValue"] = Date.now();

    let updateCommand = new UpdateCommand({
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
    try {
        // console.log("Updating key Context with reason: ", JSON.stringify(updateCommand.input, null, 2));
        let databaseKey = (await dynamodb.send(updateCommand)).Attributes as DatabaseKey
        return getFrontendKey(databaseKey);
    } catch (err) {
        if (isAWSError(err)) {
            return {
                message: err.message,
                reason: err,
                statusCode: err.$metadata?.httpStatusCode || 500
            }
        }
        return {
            message: "Unknown error",
            reason: err,
            statusCode: 500
        }
    }
}

export default {
    createKey,
    getAndIncrement,
    getKeysSinceTime,
    deleteKey,
    updateKeyContext,
};