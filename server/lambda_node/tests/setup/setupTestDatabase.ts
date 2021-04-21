import fs = require('fs');
import * as clientDynamodb from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb";
import {unmarshall} from "@aws-sdk/util-dynamodb";
import { DeleteTableCommandInput, DeleteTableCommandOutput } from '@aws-sdk/client-dynamodb';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function loadTestData(filepath: string): any {
    return JSON.parse(fs.readFileSync(filepath, 'utf8')).DataModel[0];
}

export async function setupTestDatabase(dataModel: unknown, dynamodb: DynamoDBDocumentClient): Promise<void> {
  // console.log("Starting to create test db")
  try {
    await createTestDatabase(dataModel, dynamodb);
    // console.log("Done creating test db, adding items")
  } catch(err) {
    // console.log("Error creating test db: ", JSON.stringify(err, null, 2))
  }
  await addTestItems(dataModel, dynamodb);
  // console.log("Done adding items to db")
}
export function cleanupTestDatabase(dataModel: {TableName: string}, dynamodb: DynamoDBDocumentClient): Promise<DeleteTableCommandOutput> {
    const deleteTableInput: DeleteTableCommandInput = {
        TableName: dataModel.TableName
    }
    return dynamodb.send(new clientDynamodb.DeleteTableCommand(deleteTableInput))
    // .then(_result => new Promise(function(result) {
        // console.log("Table deleted")
//   }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function addTestItems(dataModel: any, dynamodb: DynamoDBDocumentClient) {
  for (const item of dataModel.TableData) {
    // console.log("Trying to adding item: ", JSON.stringify(resolvedItem, null, 2));
    await dynamodb.send(new PutCommand({
      TableName: dataModel.TableName,
      Item: unmarshall(item)
    })).catch(err => {
      console.log("Error adding item: ", JSON.stringify(err, null, 2));
    })
    // .then(result => {
    //   console.log("Put item on startup finished with result: ", JSON.stringify(result, null, 2));
    // });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createTestDatabase(dataModel: any, dynamodb: DynamoDBDocumentClient) {
  const keySchema: clientDynamodb.KeySchemaElement[] = formatKeySchema(dataModel);
  // console.log("Creating test db")
  const indexes: clientDynamodb.GlobalSecondaryIndex[] = [];
  for (const idx of dataModel.GlobalSecondaryIndexes) {
    const newIndex: clientDynamodb.GlobalSecondaryIndex = {
      KeySchema: formatKeySchema(idx),
      IndexName: idx.IndexName,
      Projection: idx.Projection,
      ProvisionedThroughput: {
        ReadCapacityUnits: 10, 
        WriteCapacityUnits: 10
      }
    }
    indexes.push(newIndex);
  }

  const attributes: clientDynamodb.AttributeDefinition[] = [];
  attributes.push(dataModel.KeyAttributes.PartitionKey);
  attributes.push(dataModel.KeyAttributes.SortKey);
  attributes.push({
    "AttributeName": "Temporal",
    "AttributeType": "N"
  });

  const tableParams: clientDynamodb.CreateTableInput = {
    TableName: dataModel.TableName,
    AttributeDefinitions: attributes,
    GlobalSecondaryIndexes: indexes,
    KeySchema: keySchema,
    ProvisionedThroughput: {
      ReadCapacityUnits: 10,
      WriteCapacityUnits: 10
    }
  }

  try {
    await dynamodb.send(new clientDynamodb.CreateTableCommand(tableParams))
  } catch(err) {
    console.log("Created table with error: ", JSON.stringify(err, null, 2));
  }
}

function formatKeySchema(dataModel: { KeyAttributes: {[k: string]: {AttributeName: string}}}): clientDynamodb.KeySchemaElement[] {
  const attributes = dataModel.KeyAttributes;
  if (attributes === undefined) {
    return undefined;
  } else {
    const keySchemae: clientDynamodb.KeySchemaElement[] = [
          {
            AttributeName: attributes.PartitionKey.AttributeName,
            KeyType: "HASH"
          },  //Partition key
          {
            AttributeName: attributes.SortKey.AttributeName,
            KeyType: "RANGE"
          } // Sort Key
    ];
    return keySchemae;
  }
}


