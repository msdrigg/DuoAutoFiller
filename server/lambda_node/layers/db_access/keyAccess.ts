import { DynamoDBDocumentClient, PutCommand, ScanCommandInput, ScanCommand, PutCommandInput, UpdateCommandInput, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ResultOrError } from "../model/common";
import { getDatabaseKey, getFrontendKey } from "./mapping";
import { DatabaseKey } from "./models";
import constants from "../utils/constants";


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
    cuttoffDate: Date,
    dynamo: DynamoDBDocumentClient
): Promise<ResultOrError<Array<FrontendKey>>> {
    let expressionAttributeValues = {
        ':hkey': userEmail,
    }
    if (cuttoffDate !== undefined) {
        expressionAttributeValues[':rkey'] = cuttoffDate.toISOString()
    }
    let dynamoParams: ScanCommandInput = {
        TableName: constants.TABLE_NAME,
        IndexName: constants.INDEX_NAME,
        Limit: 1000,
        Select: "ALL_ATTRIBUTES",
        FilterExpression: 'PKCombined = :hkey and RangeKey > :rkey',
        ExpressionAttributeValues: expressionAttributeValues
    }
    try {
        let items: Array<DatabaseKey> = (await dynamo.send(new ScanCommand(dynamoParams))).Items as Array<DatabaseKey>;
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
        UpdateExpression: "set useCounter = useCounter + :incr",
        ExpressionAttributeNames: {
            ':incr': "1"
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

export default {
    createKey,
    getAndIncrement,
    getKeysSinceTime,
};