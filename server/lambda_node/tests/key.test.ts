import {describe, expect, beforeAll, afterAll, it} from '@jest/globals';
import keyAccess from "./../layers/db_access/keyAccess";
import { 
  DynamoDBClient,
  DynamoDBClientConfig,
  AttributeValue,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  unmarshall
} from "@aws-sdk/util-dynamodb";
import { FrontendKey } from '../layers/model/keys';
import { ErrorResponse } from '../layers/model/common';
import { DatabaseUser } from '../layers/db_access/models';
import { cleanupTestDatabase, loadTestData, setupTestDatabase } from './testDatabaseSetup';
import { TABLE_NAME } from '../layers/utils/constants';
import { getDatabaseKey } from '../layers/db_access/mapping';

let config: DynamoDBClientConfig = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
      accessKeyId: "xxxxxx",
      secretAccessKey: "xxxxxx"
    }
}
let documentClient = DynamoDBDocumentClient.from(new DynamoDBClient(config));
let testDataModel = loadTestData('./tests/testData/testDatabase.json');

beforeAll(() => {
  return setupTestDatabase(testDataModel, documentClient);
}, 10000)
afterAll(() => {
  console.log("Trying to delete test db")
  return cleanupTestDatabase(testDataModel, documentClient);
}, 10000)

describe('createUser', function () {
    it("Creates user successfully",
      async () => {
        expect.assertions(3);

        // Get valid inputKey
        let userEmail = "msd@gemail.com"
        let inputKey: FrontendKey = {
          key: "23948fsdkf",
          id: "203974fjsldf",
          context: {
              name: "testKey",
              site: "newste",
              creationDate: new Date().getTime()
           },
          useCounter: 0,
          lastContentUpdate: new Date()
        };
        // Assert that they key creation functino returns input key
        await expect(keyAccess.createKey(userEmail, inputKey, documentClient))
            .resolves.toStrictEqual(inputKey);

        // Assert that the key can be found in the database
        await expect(documentClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                PKCombined: userEmail,
                SKCombined: "K#" + inputKey.id
            }
        }))).resolves.toStrictEqual(getDatabaseKey(userEmail, inputKey));

        // Assert that we can delete the new key
        await expect(
          documentClient.send(
            new DeleteCommand({
              TableName: testDataModel.TableName,
              Key: {
                PKCombined: userEmail,
                SKCombined: "K#" + inputKey.id
              }
            })
          )
        ).resolves.toBeTruthy();
      }
    );
});


describe('getKeysSinceTime', function () {
  it.skip("Gets all keys successfully for a user who has two keys",
    async () => {
      expect.assertions(1);
      
      let validUser: DatabaseUser = testDataModel.TableData
        .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
        .filter((it: { SKCombined: string; }) => it.SKCombined == "M#")[0] as DatabaseUser;
      await expect(keyAccess.getKeysSinceTime(
        validUser.PKCombined, documentClient
      )).resolves.toStrictEqual({
        email: validUser.PKCombined,
        context: validUser.context
      });
    }
  );

  it.skip("Gets all keys successfully for a user who has no keys",
    async () => {
      expect.assertions(1);
      
      await expect(keyAccess.getKeysSinceTime(
        "emptydude@email.com", undefined, documentClient
      )).resolves.toStrictEqual([]);
    }
  );

  it.skip("Get 0 keys for a user with 2 keys filtered by time",
    async () => {
      expect.assertions(1);
      let errorResponse: ErrorResponse = {
        message: "User not found in database",
        statusCode: 404,
      }
      await expect(userAccess.getUser(
        "INVALDEMAIL@NOTEXISTS.com", documentClient
      )).resolves.toMatchObject(errorResponse);
    }
  );

  it.skip("Get 1 keys for a user with 2 keys filtered by time",
    async () => {
      expect.assertions(1);
      let errorResponse: ErrorResponse = {
        message: "User not found in database",
        statusCode: 404,
      }
      await expect(userAccess.getUser(
        "INVALDEMAIL@NOTEXISTS.com", documentClient
      )).resolves.toMatchObject(errorResponse);
    }
  );
});

describe('deleteKey', function () {
  it.skip("Deletes key successfully",
    async () => {
      expect.assertions(1);
      
      let validUser: DatabaseUser = testDataModel.TableData
        .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
        .filter((it: { SKCombined: string; }) => it.SKCombined == "M#")[0] as DatabaseUser;
      await expect(userAccess.getUser(
        validUser.PKCombined, documentClient
      )).resolves.toStrictEqual({
        email: validUser.PKCombined,
        context: validUser.context
      });
    }
  );
});

describe('getAndUpdateKey', function () {
  it.skip("Gets and updates key successfully",
    async () => {
      expect.assertions(1);
      
      let validUser: DatabaseUser = testDataModel.TableData
        .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
        .filter((it: { SKCombined: string; }) => it.SKCombined == "M#")[0] as DatabaseUser;
      await expect(keyAccess.updateKey(
        validUser.PKCombined, documentClient
      )).resolves.toStrictEqual({
        email: validUser.PKCombined,
        context: validUser.context
      });
    }
  );
})

describe('updateKey', function () {
  it.skip("Updates key successfully",
    async () => {
      expect.assertions(1);
      
      let validUser: DatabaseUser = testDataModel.TableData
        .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
        .filter((it: { SKCombined: string; }) => it.SKCombined == "M#")[0] as DatabaseUser;
      await expect(keyAccess.updateKey(
        validUser.PKCombined, documentClient
      )).resolves.toStrictEqual({
        email: validUser.PKCombined,
        context: validUser.context
      });
    }
  );
});
