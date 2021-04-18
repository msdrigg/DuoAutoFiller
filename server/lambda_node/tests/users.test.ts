import {describe, expect, afterEach, beforeEach, it} from '@jest/globals';
import userAccess from "./../layers/db_access/userAccess";
import AWS = require('aws-sdk');
import { 
  GetItemInput,
  PutItemInput,
  DeleteItemInput,
  DocumentClient,
  Converter,
} from 'aws-sdk/clients/dynamodb';
import DynamoDB = require('aws-sdk/clients/dynamodb');
import { AuthUser } from '../layers/model/users';
import { ErrorResponse } from '../layers/model/common';
import { DatabaseUser } from '../layers/db_access/models';

var fs = require('fs');

AWS.config.update({
    region: "us-east-1",
    dynamodb: {
      endpoint: "http://localhost:8000",
      accessKeyId: "xxxxxx",
      secretAccessKey: "xxxxxx"
    }
});

let dynamodb = new AWS.DynamoDB();
let documentClient = new AWS.DynamoDB.DocumentClient();
let testDataModel = JSON.parse(fs.readFileSync('./tests/testData/testDatabase.json', 'utf8')).DataModel[0];

async function setupTestDatabase(dataModel: any, dynamodb: DynamoDB) {
  console.log("Starting to create test db")
  await createTestDatabase(dataModel, dynamodb);
  console.log("Done creating test db, adding items")
  await addTestItems(dataModel, dynamodb);
  console.log("Done adding items to db")
}
async function cleanupTestDatabase(dataModel: any, dynamodb: DynamoDB) {
  await dynamodb.deleteTable({
    TableName: dataModel.TableName
  }).promise().then(result => new Promise(function(result) {
    console.log("Table deleted")
  }));
}

async function addTestItems(dataModel: any, dynamodb: DynamoDB) {
  for (const item of dataModel.TableData) {
    await dynamodb.putItem({
      TableName: dataModel.TableName,
      Item: item
    }).promise();
    console.log("Put item on startup succeeded")
  }
}

async function createTestDatabase(dataModel: any, dynamodb: DynamoDB) {
  let dataModelFormatted = formatKeySchema(dataModel);
  console.log("Creating test db")

  dataModelFormatted.GlobalSecondaryIndexes = dataModel.GlobalSecondaryIndexes.map(idx => {
    let newSI = formatKeySchema(idx);
    newSI.ProvisionedThroughput = {       
        ReadCapacityUnits: 10, 
        WriteCapacityUnits: 10
    };
    return newSI;
  });
  let newAttributes = [];
  newAttributes.push(dataModel.KeyAttributes.PartitionKey);
  newAttributes.push(dataModel.KeyAttributes.SortKey);
  newAttributes.push({
    "AttributeName": "temporal",
    "AttributeType": "S"
  });
  dataModelFormatted.AttributeDefinitions = newAttributes;
  delete dataModelFormatted["NonKeyAttributes"];
  delete dataModelFormatted["DataAccess"];
  delete dataModelFormatted["TableData"];
  dataModelFormatted.ProvisionedThroughput = {       
    ReadCapacityUnits: 10, 
    WriteCapacityUnits: 10
  };

  //console.log("About to run db.createTable\n",JSON.stringify(dataModelFormatted, null, 2));

  await dynamodb.createTable(dataModelFormatted).promise()
  console.log("Created table.")
  //console.log("Table description JSON:", JSON.stringify(data, null, 2));
}

function formatKeySchema(dataModel) {
  let attributes = dataModel.KeyAttributes;
  if (attributes === undefined) {
    return dataModel
  } else {
    let dataCopy = { ...dataModel};
    let newAttributes = [
          {
            AttributeName: attributes.PartitionKey.AttributeName,
            KeyType: "HASH"
          },  //Partition key
          {
            AttributeName: attributes.SortKey.AttributeName,
            KeyType: "RANGE"
          } // Sort Key
    ];
    dataCopy.KeySchema = newAttributes;

    delete dataCopy['KeyAttributes'];
    return dataCopy;
  }
}

beforeEach(() => {
  return setupTestDatabase(testDataModel, dynamodb);
})

afterEach(() => {
  return cleanupTestDatabase(testDataModel, dynamodb);
})

describe('createUser', function () {
    it("Creates user successfully",
      async () => {
        // Get valid frontendUser
        let frontUser: AuthUser = {
          email: "validEmail@address.com",
          passwordHash: "ase423lk4fdj",
          context: {name: "valid man"},
        };
        expect(userAccess.createUser(
          frontUser.email,
          frontUser.passwordHash,
          frontUser.context,
          documentClient
        )).resolves.toEqual({
          email: frontUser.email,
          context: frontUser.context
        });

        expect(userAccess.getUser(
          frontUser.email, documentClient
        )).resolves.toBe({
          email: frontUser.email,
          context: frontUser.context
        });
      }
    );

    it("Creates user fails with conflict",
      async () => {
        // Get a frontendUser from the datamodel
        let databaseUser = testDataModel.TableData.filter(it => it.SKCombined.S == "M#")[0];
        let frontUser: AuthUser = {
          email: databaseUser.PKCombined.S,
          passwordHash: "ase423lk4fdj",
          context: {
            name: "valid man"
          },
        }
        let errorResponse: ErrorResponse = {
          message: "User with provided email already exists",
          statusCode: 409,
        }
        expect(userAccess.createUser(
          frontUser.email,
          frontUser.passwordHash,
          frontUser.context,
          documentClient
        )).resolves.toEqual(errorResponse);
      }
    );
});


describe('getUser', function () {
  it("Gets user successfully",
    async () => {
      let validUser: DatabaseUser = testDataModel.TableData
        .map(it => Converter.unmarshall(it))
        .filter(it => it.SKCombined == "M#")[0] as DatabaseUser;
      console.log("Getting user: ", JSON.stringify(validUser, null, 2));
      expect(userAccess.getUser(
        validUser.PKCombined, documentClient
      )).resolves.toStrictEqual({
        email: validUser.PKCombined,
        context: validUser.context
      });
    }
  );

  it("Gets user fails with not found",
    async () => {
      let errorResponse: ErrorResponse = {
        message: "User not found in database",
        statusCode: 404,
      }
      expect(userAccess.getUser(
        "INVALDEMAIL@NOTEXISTS.com", documentClient
      )).resolves.toEqual(errorResponse);
    }
  );
});
