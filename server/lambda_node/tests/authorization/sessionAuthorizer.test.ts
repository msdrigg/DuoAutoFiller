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
import { constants, httpUtils, SessionAuthorizationContext } from '../../layers/common';
import { TABLE_NAME } from '../../layers/common/utils/constants';
import { DatabaseSession, SessionRepository } from '../../layers/sessions/repository';
import { cleanupTestDatabase, loadTestData, setupTestDatabase } from '../setup/setupTestDatabase';
import { getCookieString } from '../../layers/common/utils/httpUtils';

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

        const cookies = [
          getCookieString(constants.EMAIL_COOKIE_NAME, httpUtils.encodeUnicode(validSession.PKCombined)),
          getCookieString(constants.SESSION_COOKIE_NAME, validSession.SKCombined.slice(2))
        ];

        await expect(authorizeSession(cookies, sessionRepository))
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

        const fakeSession = validSessions.find(it => it.Temporal > Date.now());
        fakeSession.PKCombined = "blahbalhsd@ggg.comk";
        const unAuthorized: LambdaAuthorization = {
          isAuthorized: false,
        };

        const cookies = [
          getCookieString(constants.EMAIL_COOKIE_NAME, httpUtils.encodeUnicode(fakeSession.PKCombined)),
          getCookieString(constants.SESSION_COOKIE_NAME, fakeSession.SKCombined.slice(2))
        ];
        
        await expect(authorizeSession(cookies, sessionRepository))
          .resolves.toEqual(unAuthorized);
      }
    );

    it("Authorize session fails with session id not exists",
        async () => {
        expect.assertions(1);

        const fakeSession = validSessions.find(it => it.Temporal > Date.now());
        fakeSession.SKCombined = "S#dlasdflkjcomk";
        const unAuthorized: LambdaAuthorization = {
          isAuthorized: false,
        };

        const cookies = [
          getCookieString(constants.EMAIL_COOKIE_NAME, httpUtils.encodeUnicode(fakeSession.PKCombined)),
          getCookieString(constants.SESSION_COOKIE_NAME, fakeSession.SKCombined.slice(2))
        ];
        
        await expect(authorizeSession(cookies, sessionRepository))
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

        const cookies = [
          getCookieString(constants.EMAIL_COOKIE_NAME, httpUtils.encodeUnicode(fakeSession.PKCombined)),
          getCookieString(constants.SESSION_COOKIE_NAME, fakeSession.SKCombined.slice(2))
        ];
        
        await expect(authorizeSession(cookies, sessionRepository))
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

    it("Authorize session fails with mangled data",
        async () => {
        expect.assertions(2);

        const cookies1 = [
          "poopyalskjrejd",
          "jlqwekrjdfslkasdf"
        ];
        
        await expect(authorizeSession(cookies1, sessionRepository))
          .resolves.toEqual({
            isAuthorized: false
          });

        const cookies2 = [
          "email=234kjl234@gmail.com",
          "sessionId=23lk4jlaksdjrf"
        ];
        
        await expect(authorizeSession(cookies2, sessionRepository))
          .resolves.toEqual({
            isAuthorized: false
          });
      }
    );
});
