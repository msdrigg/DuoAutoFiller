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
import { DatabaseKey, DatabaseUser } from '../layers/db_access/models';
import { cleanupTestDatabase, loadTestData, setupTestDatabase } from './testDatabaseSetup';
import { TABLE_NAME } from '../layers/utils/constants';
import { getDatabaseKey, getFrontendKey } from '../layers/db_access/mapping';

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
let validUsers: Array<DatabaseUser> = testDataModel.TableData
  .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
  .filter((it: DatabaseUser) => it.SKCombined == "M#")
let validKeys: Array<DatabaseKey> = testDataModel.TableData
  .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
  .filter((it: DatabaseUser) => it.SKCombined.startsWith("K#"))


beforeAll(() => {
  return setupTestDatabase(testDataModel, documentClient);
}, 10000)
afterAll(() => {
  return cleanupTestDatabase(testDataModel, documentClient);
}, 10000)

describe('createKey', function () {
    it.skip("Creates key successfully",
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
  it("Gets all keys successfully for a user who has at least two keys",
    async () => {
      expect.assertions(1);
      
      let userWithTwoKeys: DatabaseUser = validUsers.find(user => {
        return validKeys.filter(key => {
          return key.PKCombined == user.PKCombined
        }).length >= 2;
      });
      let usersKeys: Array<FrontendKey> = validKeys.filter(key => {
        return key.PKCombined == userWithTwoKeys.PKCombined
      }).map(key => {
        return getFrontendKey(key);
      });
      await expect(keyAccess.getKeysSinceTime(
        userWithTwoKeys.PKCombined, undefined,  documentClient
      )).resolves.toStrictEqual(usersKeys);
    }
  );

  it("Gets all keys successfully for a user who has no keys",
    async () => {
      expect.assertions(1);
      
      let userWithNoKeys: DatabaseUser = validUsers.find(user => {
        return validKeys.filter(key => {
          return key.PKCombined == user.PKCombined
        }).length == 0;
      });
      await expect(keyAccess.getKeysSinceTime(
        userWithNoKeys.PKCombined, undefined, documentClient
      )).resolves.toStrictEqual([]);
    }
  );

  it("Get 0 keys for a user with 2 keys filtered by time",
    async () => {
      expect.assertions(1);
      let userWithTwoKeys: DatabaseUser = validUsers.find(user => {
        return validKeys.filter(key => {
          return key.PKCombined == user.PKCombined
        }).length >= 2;
      });
      
      await expect(keyAccess.getKeysSinceTime(
        userWithTwoKeys.PKCombined, new Date(Number.MAX_SAFE_INTEGER), documentClient
      )).resolves.toStrictEqual([]);
    }
  );

  it("Get 1 keys for a user with at least 2 keys filtered by time",
    async () => {
      expect.assertions(2);
      let userWithTwoOrMoreKeys: DatabaseUser = validUsers.find(user => {
        return validKeys.filter(key => {
          return key.PKCombined == user.PKCombined
        }).length >= 2;
      });
      let usersKeys: Array<DatabaseKey> = validKeys.filter(key => {
        return key.PKCombined == userWithTwoOrMoreKeys.PKCombined
      });
      let inBetweenTime = usersKeys.reduce(function (accumulator, currentValue) {
        return accumulator + currentValue.temporal / 1000
      }, 0) / usersKeys.length * 1000;
      let expectedKeys = usersKeys.filter(key => {
        return key.temporal > inBetweenTime
      }).map(key => {
        return getFrontendKey(key)
      });

      expect(expectedKeys.length).toBeLessThan(usersKeys.length);
      await expect(keyAccess.getKeysSinceTime(
        userWithTwoOrMoreKeys.PKCombined, new Date(inBetweenTime), documentClient
      )).resolves.toStrictEqual(expectedKeys);
    }
  );
});

describe.skip('deleteKey', function () {
  it("Deletes key successfully",
    async () => {
      expect.assertions(1);
      
      let validUser: DatabaseUser = testDataModel.TableData
        .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
        .filter((it: { SKCombined: string; }) => it.SKCombined == "M#")[0] as DatabaseUser;
      let keyId = "hihi";
      await expect(keyAccess.deleteKey(
        validUser.PKCombined, keyId, documentClient
      )).resolves.toStrictEqual({
        email: validUser.PKCombined,
        context: validUser.context
      });
    }
  );
});

describe.skip('getAndIncrement', function () {
  it("Gets and increments key counter",
    async () => {
      expect.assertions(1);
      
      let validUser: DatabaseUser = testDataModel.TableData
        .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
        .filter((it: { SKCombined: string; }) => it.SKCombined == "M#")[0] as DatabaseUser;
      let keyId = "hi";
      await expect(keyAccess.getAndIncrement(
        validUser.PKCombined, keyId, documentClient
      )).resolves.toStrictEqual({
        email: validUser.PKCombined,
        context: validUser.context
      });
    }
  );
})

describe.skip('updateKeyContext', function () {
  it("Updates key context successfully",
    async () => {
      expect.assertions(1);

      let validUserEmail = "hi@hi.com";
      let keyId = "hihi";
      let newKeyContext = undefined;
      await expect(keyAccess.updateKeyContext(
        validUserEmail, keyId, newKeyContext, documentClient
      )).resolves.toStrictEqual({
      });
    }
  );
});
