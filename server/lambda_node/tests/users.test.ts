import {describe, expect, beforeAll, afterAll, it} from '@jest/globals';
import userAccess from "./../layers/db_access/userAccess";
import { 
  DynamoDBClient,
  DynamoDBClientConfig,
  AttributeValue,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import {
  unmarshall
} from "@aws-sdk/util-dynamodb";
import { AuthUser } from '../layers/model/users';
import { ErrorResponse } from '../layers/model/common';
import { DatabaseUser } from '../layers/db_access/models';
import { cleanupTestDatabase, loadTestData, setupTestDatabase } from './testDatabaseSetup';

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

        // Get valid frontendUser
        let frontUser: AuthUser = {
          email: "validEmail@address.com",
          passwordHash: "ase423lk4fdj",
          context: {name: "valid man"},
        };
        await expect(userAccess.createUser(
          frontUser.email,
          frontUser.passwordHash,
          frontUser.context,
          documentClient
        )).resolves.toStrictEqual({
          email: frontUser.email,
          context: frontUser.context
        });

        await expect(userAccess.getUser(
          frontUser.email, documentClient
        )).resolves.toEqual({
          email: frontUser.email,
          context: frontUser.context
        });

        //console.log(JSON.stringify(testDataModel, null, 2));
        await expect(
          documentClient.send(
            new DeleteCommand({
              TableName: testDataModel.TableName,
              Key: {
                PKCombined: frontUser.email,
                SKCombined: "M#"
              }
            })
          )
        ).resolves.toBeTruthy();
      }
    );

    it("Creates user fails with conflict",
      async () => {
        expect.assertions(1);
        
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
          reason: expect.any(Object),
          statusCode: 409,
        }
        await expect(userAccess.createUser(
          frontUser.email,
          frontUser.passwordHash,
          frontUser.context,
          documentClient
        )).resolves.toMatchObject(errorResponse);
      }
    );
});


describe('getUser', function () {
  it("Gets user successfully",
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

  it("Gets user fails with not found",
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

describe('deleteUser', function () {
  it.skip("Deletes user successfully",
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

describe('updateUser', function () {
  it.skip("Updates user context successfully",
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
