import fs = require('fs');
import * as clientDynamodb from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient, PutCommand} from "@aws-sdk/lib-dynamodb";
import {unmarshall} from "@aws-sdk/util-dynamodb";
import { DeleteTableCommandInput } from '@aws-sdk/client-dynamodb';

export function loadTestData(filepath: string) {
    return JSON.parse(fs.readFileSync(filepath, 'utf8')).DataModel[0];
}

export async function setupTestDatabase(dataModel: any, dynamodb: DynamoDBDocumentClient) {
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
export function cleanupTestDatabase(dataModel: any, dynamodb: DynamoDBDocumentClient) {
    let deleteTableInput: DeleteTableCommandInput = {
        TableName: dataModel.TableName
    }
    return dynamodb.send(new clientDynamodb.DeleteTableCommand(deleteTableInput))
    // .then(_result => new Promise(function(result) {
        // console.log("Table deleted")
//   }));
}

async function addTestItems(dataModel: any, dynamodb: DynamoDBDocumentClient) {
  for (const item of dataModel.TableData) {
    let resolvedItem = unmarshall(item);
    resolvedItem.temporal = Number(resolvedItem.temporal);
    // console.log("Trying to adding item: ", JSON.stringify(resolvedItem, null, 2));
    await dynamodb.send(new PutCommand({
      TableName: dataModel.TableName,
      Item: resolvedItem
    })).catch(err => {
      console.log("Error adding item: ", JSON.stringify(err, null, 2));
    })
    // .then(result => {
    //   console.log("Put item on startup finished with result: ", JSON.stringify(result, null, 2));
    // });
  }
}

async function createTestDatabase(dataModel: any, dynamodb: DynamoDBDocumentClient) {
  let keySchema: clientDynamodb.KeySchemaElement[] = formatKeySchema(dataModel);
  // console.log("Creating test db")
  let indexes: clientDynamodb.GlobalSecondaryIndex[] = [];
  for (const idx of dataModel.GlobalSecondaryIndexes) {
    let newIndex: clientDynamodb.GlobalSecondaryIndex = {
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

  let attributes: clientDynamodb.AttributeDefinition[] = [];
  attributes.push(dataModel.KeyAttributes.PartitionKey);
  attributes.push(dataModel.KeyAttributes.SortKey);
  attributes.push({
    "AttributeName": "temporal",
    "AttributeType": "N"
  });

  let tableParams: clientDynamodb.CreateTableInput = {
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
    await dynamodb.send(new clientDynamodb.CreateTableCommand(tableParams)).then(
      result => {
        // console.log("Created table with result: ", JSON.stringify(result, null, 2));
      }
    )
  } catch(err) {
    console.log("Created table with error: ", JSON.stringify(err, null, 2));
  }
}

function formatKeySchema(dataModel: any): clientDynamodb.KeySchemaElement[] {
  let attributes = dataModel.KeyAttributes;
  if (attributes === undefined) {
    return undefined;
  } else {
    let keySchemae: clientDynamodb.KeySchemaElement[] = [
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
