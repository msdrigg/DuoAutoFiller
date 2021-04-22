import {
    DynamoDBDocumentClient,
    PutCommand,
    QueryCommand,
    QueryCommandInput,
    PutCommandInput,
    UpdateCommandInput,
    UpdateCommand,
    DeleteCommandInput,
    DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import { CoreKey, KeyContext } from ".";
import { ResultOrError, DatabaseRow, constants, getResponsibleError } from "../common";
import { createDatabaseKey, getFrontendKey } from "./mapping";
import { CreationKey } from "./model";

/**
 * Key respository for testing purposes
 */
export interface IKeyRepository {
    createKey(
        userEmail: string,
        frontendKey: CreationKey
    ): Promise<ResultOrError<CoreKey>>
    getKeysSinceTime(
        userEmail: string,
        cuttoffDate: Date | undefined
    ): Promise<ResultOrError<Array<CoreKey>>>
    getAndIncrement(
        userEmail: string,
        keyId: string
    ): Promise<ResultOrError<CoreKey>>
    deleteKey(
        userEmail: string,
        keyId: string
    ): Promise<ResultOrError<void>>
    updateKeyContext(
        userEmail: string,
        keyId: string,
        updatedContext: KeyContext
    ): Promise<ResultOrError<CoreKey>>
}

export type DatabaseKey = DatabaseRow & {
    Context: KeyContext,
    Key: string,
    UseCounter: number,
    Temporal: number,
}

/**
 * Repository in class structure to store keys
 */
export class KeyRepository implements IKeyRepository {
    dynamo: DynamoDBDocumentClient;
    constructor (dynamo: DynamoDBDocumentClient) {
        this.dynamo = dynamo;
    }

    /**
     * Creates a key and returns the created key
     * 
     * @param {typedefs.FrontendKey} [frontendKey] The key to add
     * @param {string} [useremail] The email to associate the key with
     * @param {AWS.DynamoDB.DocumentClient} [dynamo] client for accessing dynamo 
     *  
     * @throws {typedefs.DynamoError} any dynamo error creating the user
     * @returns {typedefs.FrontendKey} the user created, undefined if the user fails to be created
     */
    async createKey(
        userEmail: string,
        frontendKey: CreationKey,
    ): Promise<ResultOrError<CoreKey>> {
        const databaseKey: DatabaseKey = createDatabaseKey(userEmail, frontendKey);
        const commandInput: PutCommandInput = {
            TableName: constants.TABLE_NAME,
            Item: databaseKey
        }
        return await this.dynamo.send(new PutCommand(commandInput))
            .then(_result => getFrontendKey(databaseKey))
            .catch(err => getResponsibleError(err));
    }


    /**
     * Returns keys as a list given conditions
     * 
     * @param {string} [userEmail] Authorized users email
     * @param {Date=} [cuttoffDate] Only return keys that have content updates after this date
     * @param {AWS.DynamoDB.DocumentClient} [dynamo] client for accessing dynamo 
     * 
     * @returns {List<typedefs.FrontendKey>} The keys matching the criterion
     */
    async getKeysSinceTime(
        userEmail: string,
        cuttoffDate: Date | undefined,
    ): Promise<ResultOrError<Array<CoreKey>>> {
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

        return await this.dynamo.send(new QueryCommand(dynamoParams))
            .then(output =>  output.Items.map(item => getFrontendKey(item as DatabaseKey)))
            .catch(err => getResponsibleError(err));
    }

    /**
     * Increments usageCounter and returns the updated key
     * 
     * @param {string} [userEmail] Authorized users email
     * @param {string} [keyId] The key to access
     * @param {DynamoDBDocumentClient} [dynamo] client for accessing dynamo 
     * 
     * @throws {DynamoError} any dynamo error creating the user
     * @returns {CoreKey} The keys matching the criterion
     */
    async getAndIncrement(
        userEmail: string,
        keyId: string,
    ): Promise<ResultOrError<CoreKey>> {
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

        return await this.dynamo.send(new UpdateCommand(updateCommandInput))
            .then(result => getFrontendKey(result.Attributes as DatabaseKey))
            .catch(err => getResponsibleError(err));
    }

    async deleteKey(
        userEmail: string,
        keyId: string,
    ): Promise<ResultOrError<void>> {
        const commandInput: DeleteCommandInput = {
            TableName: constants.TABLE_NAME,
            Key: {
                PKCombined: userEmail,
                SKCombined: "K#" + keyId
            }
        }

        return await this.dynamo.send(new DeleteCommand(commandInput))
            .then(_result => undefined)
            .catch(err => getResponsibleError(err));
    }

    async updateKeyContext(
        userEmail: string,
        keyId: string,
        updatedContext: KeyContext,
    ): Promise<ResultOrError<CoreKey>> {
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

        return await this.dynamo.send(updateCommand)
            .then(result => getFrontendKey(result.Attributes as DatabaseKey))
            .catch(err => getResponsibleError(err))
    }
}