import {describe, expect, beforeAll, afterAll, it} from '@jest/globals';
import { 
    AttributeValue,
  DynamoDBClient,
  DynamoDBClientConfig,
} from '@aws-sdk/client-dynamodb';
import {
    DeleteCommand,
  DynamoDBDocumentClient, GetCommand, GetCommandOutput, PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { authorizeSession } from '../../layers/authorization';
import { LambdaAuthorization } from '../../layers/authorization/model';
import { SessionAuthorizationContext } from '../../layers/common';
import { TABLE_NAME } from '../../layers/common/utils/constants';
import { DatabaseSession, SessionRepository } from '../../layers/sessions/repository';
import { loadTestData, setupTestDatabase, cleanupTestDatabase } from '../setup/setupTestDatabase';

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
const testDataModel = loadTestData('./tests/setup/testData/AutoAuthenticateDatabase.json');
const validSessions: Array<DatabaseSession> = testDataModel.TableData
  .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
  .filter((it: DatabaseSession) => it.SKCombined.startsWith("S#"))

beforeAll(() => {
  return setupTestDatabase(testDataModel, documentClient);
}, 10000)
afterAll(() => {
  return cleanupTestDatabase(testDataModel, documentClient);
}, 10000)

describe('authorizeUser', function () {
    it("Authorize session successfully",
      async () => {
        expect.assertions(3);

        const validSessionEmail = validSessions[0].PKCombined;
        const validSession: DatabaseSession = {
            PKCombined: validSessionEmail,
            SKCombined: "S#" + "234ijfsdfklj",
            Context: {Name: "Bro"},
            Temporal: Date.now() + 1000*20,
            Key: "2l34jlasdfj"
        }
        const context: SessionAuthorizationContext = {
            userEmail: validSession.PKCombined,
            sessionId: validSession.SKCombined.slice(2)
        }
        const authorized: LambdaAuthorization = {
          isAuthorized: true,
          context: context
        };
        await expect(documentClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: validSession
        }))).resolves.toBeTruthy()

        await expect(authorizeSession(validSession.PKCombined, validSession.SKCombined.slice(2), sessionRepository))
          .resolves.toEqual(authorized);

        await expect(documentClient.send(new DeleteCommand({
            TableName: TABLE_NAME,
            Key: {
                PKCombined: validSession.PKCombined,
                SKCombined: validSession.SKCombined,
            }
        }))).resolves.toBeTruthy()
      }
    );

    it("Authorize user fails with user not exists",
      async () => {
        expect.assertions(1);

        const fakeSession = validSessions[0];
        fakeSession.PKCombined = "blahbalhsd@ggg.comk";
        const unAuthorized: LambdaAuthorization = {
          isAuthorized: false,
        };
        await expect(authorizeSession(fakeSession.PKCombined, fakeSession.SKCombined.slice(2), sessionRepository))
          .resolves.toEqual(unAuthorized);
      }
    );

    it("Authorize session fails with session id not exists",
        async () => {
        expect.assertions(1);

        const fakeSession = validSessions[0];
        fakeSession.SKCombined = "S#asdoifuasdjfek";
        const unAuthorized: LambdaAuthorization = {
          isAuthorized: false,
        };
        await expect(authorizeSession(fakeSession.PKCombined, fakeSession.SKCombined.slice(2), sessionRepository))
          .resolves.toEqual(unAuthorized);
      }
    );

    it("Authorize session fails with session expired",
        async () => {
        expect.assertions(3);

        const fakeSession = validSessions.find(it => {
            return it.Temporal < Date.now()
        });
        const unAuthorized: LambdaAuthorization = {
          isAuthorized: false,
        };
        await expect(authorizeSession(fakeSession.PKCombined, fakeSession.SKCombined.slice(2), sessionRepository))
          .resolves.toEqual(unAuthorized);

        // Make sure the session has been deleted
        await expect(documentClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                PKCombined: fakeSession.PKCombined,
                SKCombined: fakeSession.SKCombined
            }
        })).then((it: GetCommandOutput) => it.Item)).resolves.toBeUndefined();
        
        // Put it back now that it's gone
        await expect(documentClient.send(new PutCommand({
            TableName: TABLE_NAME,
            Item: fakeSession
        }))).resolves.toBeTruthy();
      }
    );
});