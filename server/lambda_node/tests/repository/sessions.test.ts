import {describe, expect, beforeAll, afterAll, it} from '@jest/globals';
import { 
  DynamoDBClient,
  DynamoDBClientConfig,
  AttributeValue,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  unmarshall
} from "@aws-sdk/util-dynamodb";
import { TABLE_NAME } from '../../layers/common/utils/constants';
import { getFrontendSession, getDatabaseSession } from '../../layers/sessions/mapping';
import { DatabaseSession, SessionRepository } from '../../layers/sessions/repository';
import { DatabaseUser } from '../../layers/users/repository';
import { loadTestData, setupTestDatabase, cleanupTestDatabase } from '../setup/setupTestDatabase';
import { createResponsibleError, ErrorType } from '../../layers/common';

const config: DynamoDBClientConfig = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
      accessKeyId: "xxxxxx",
      secretAccessKey: "xxxxxx"
    }
}
const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient(config));
const sessionRepository = new SessionRepository(documentClient);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const testDataModel = loadTestData('./tests/setup/testData/AutoAuthenticateDatabase.json') as {TableName: string, TableData: any}
const validUsers: Array<DatabaseUser> = testDataModel.TableData
  .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
  .filter((it: DatabaseUser) => it.SKCombined == "M#")
const validSessions: Array<DatabaseSession> = testDataModel.TableData
  .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
  .filter((it: DatabaseSession) => it.SKCombined.startsWith("S#"))

beforeAll(() => {
  return setupTestDatabase(testDataModel, documentClient);
}, 10000)
afterAll(() => {
  return cleanupTestDatabase(testDataModel, documentClient);
}, 10000)

describe('createSession', function () {
    it("Creates session successfully", async () => {
        expect.assertions(3);

        const validSession: DatabaseSession = validSessions[0];

        // Get valid frontendUser
        const userEmail = validSession.PKCombined;
        const id = "asldkfj20394";
        const name = "New_Sesssion_Test";
        const expiry = new Date(Date.now() + 1000 * 50);

        await expect(sessionRepository.createSession(
            userEmail,
            id,
            name,
            expiry
        )).resolves.toMatchObject({
            Id: id,
            Context: {Name: name},
            Expiration: expiry,
            Key: expect.any(String)
        });

        await expect(sessionRepository.getSession(
          userEmail, id
        )).resolves.toMatchObject({
            Id: id,
            Context: {Name: name},
            Expiration: expiry,
            Key: expect.any(String)
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
    
    const validSession: DatabaseSession = validSessions[0];

    validSession.Temporal = Number(validSession.Temporal);
    const frontendSession = getFrontendSession(validSession);
    await expect(sessionRepository.getSession(
    validSession.PKCombined, validSession.SKCombined.slice(2)
    )).resolves.toStrictEqual(frontendSession);
}
  );

  it("Gets session fails with user email not exists",
    async () => {
      expect.assertions(1);

      const error = createResponsibleError(ErrorType.DatabaseError, "Session not found matching email and id", 404);
      await expect(sessionRepository.getSession(
        "INVALDEMAIL@NOTEXISTS.com", "asdflkj23"
      )).resolves.toEqual(error);
    }
  );

  it("Get session fails with session not exists", async () => {
    expect.assertions(1);
    const validUser: DatabaseUser = validUsers[0];
    
    const error = createResponsibleError(ErrorType.DatabaseError, "Session not found matching email and id", 404);
    await expect(sessionRepository.getSession(
        validUser.PKCombined, "asdflkj23"
    )).resolves.toEqual(error);
    }
  );
});


describe('deleteSession', function () {
    it("Deletes session successfully", async () => {
        expect.assertions(4);

        const validSession: DatabaseSession = validSessions[0];

        // Get valid frontendUser
        const userEmail = validSession.PKCombined;
        const databaseSession = getDatabaseSession(
          userEmail, 
          {
            Expiration: new Date(),
            Context: {
              Name: "testSesh"
            },
            Key: "hehe3k23k",
            Id: "flk2j32f"
          }
        );

        await expect(documentClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: databaseSession
          })
        )).resolves.toBeTruthy();

        await expect(sessionRepository.getSession(
          userEmail, databaseSession.SKCombined.slice(2)
        )).resolves.toMatchObject(getFrontendSession(databaseSession));

        await expect(sessionRepository.deleteSession(
          userEmail, databaseSession.SKCombined.slice(2))
        ).resolves.toBeUndefined();

        await expect(documentClient.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: {
              PKCombined: databaseSession.PKCombined,
              SKCombined: databaseSession.SKCombined
            }
          })
        ).then(it => {it.Item})).resolves.toBeUndefined();
      }
    );
});
