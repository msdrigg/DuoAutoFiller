import {describe, expect, beforeAll, afterAll, it} from '@jest/globals';
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
import { DatabaseSession, DatabaseUser } from '../layers/db_access/models';
import { cleanupTestDatabase, loadTestData, setupTestDatabase } from './testDatabaseSetup';
import { getFrontendSession } from '../layers/db_access/mapping';
import sessionAccess from './../layers/db_access/sessionAccess';

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

describe('createSession', function () {
    it("Creates session successfully", async () => {
        expect.assertions(3);

        let validSession: DatabaseSession = testDataModel.TableData
            .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
            .filter((it: { SKCombined: string; }) => it.SKCombined.startsWith("S#"))[0] as DatabaseSession;
        validSession.temporal = Number(validSession.temporal);
        // Get valid frontendUser
        let userEmail = validSession.PKCombined;
        let id = "asldkfj20394";
        let name = "New_Sesssion_Test";
        let expiry = new Date(validSession.temporal);

        await expect(sessionAccess.createSession(
            userEmail,
            id,
            name,
            expiry,
            documentClient
        )).resolves.toMatchObject({
            id: id,
            context: {name: name},
            expiration: expiry,
            key: expect.any(String)
        });

        await expect(sessionAccess.getSession(
          userEmail, id, documentClient
        )).resolves.toMatchObject({
            id: id,
            context: {name: name},
            expiration: expiry,
            key: expect.any(String)
        });

        //console.log(JSON.stringify(testDataModel, null, 2));
        await expect(
          documentClient.send(
            new DeleteCommand({
              TableName: testDataModel.TableName,
              Key: {
                PKCombined: userEmail,
                SKCombined: "S#" + id
              }
            })
          )
        ).resolves.toBeTruthy();
      }
    );
});


describe('getSession', function () {
  it("Gets session successfully", async () => {
    expect.assertions(1);
    
    let validSession: DatabaseSession = testDataModel.TableData
        .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
        .filter((it: { SKCombined: string; }) => it.SKCombined.startsWith("S#"))[0] as DatabaseSession;
    validSession.temporal = Number(validSession.temporal);
    let frontendSession = getFrontendSession(validSession);
    await expect(sessionAccess.getSession(
    validSession.PKCombined, validSession.SKCombined.slice(2), documentClient
    )).resolves.toStrictEqual(frontendSession);
}
  );

  it("Gets session fails with user email not exists",
    async () => {
      expect.assertions(1);

      await expect(sessionAccess.getSession(
        "INVALDEMAIL@NOTEXISTS.com", "asdflkj23", documentClient
      )).resolves.toBeUndefined();
    }
  );

  it("Get session fails with session not exists", async () => {
    expect.assertions(1);
    let validUser: DatabaseUser = testDataModel.TableData
        .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
        .filter((it: { SKCombined: string; }) => it.SKCombined == "M#")[0] as DatabaseUser
    
    

    await expect(sessionAccess.getSession(
        validUser.PKCombined, "asdflkj23", documentClient
    )).resolves.toBeUndefined();
    }
  );
});