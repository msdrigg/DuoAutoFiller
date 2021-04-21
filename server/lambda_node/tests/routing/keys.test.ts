import {describe, expect, beforeAll, afterAll, it} from '@jest/globals';
import { 
  DynamoDBClient,
  DynamoDBClientConfig,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { KeyRouter, KeyRepository } from '../../layers/keys';
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
const requestRouter = new KeyRouter(new KeyRepository(documentClient));
const testDataModel = loadTestData('./tests/setup/testData/AutoAuthenticateDatabase.json');

beforeAll(() => {
  return setupTestDatabase(testDataModel, documentClient);
}, 10000)
afterAll(() => {
  return cleanupTestDatabase(testDataModel, documentClient);
}, 10000)

describe('routeRequest with unknown route', function () {
    it("returns error as expected",
      async () => {
        expect.assertions(1);
        
        const pathFail = ["poop"]
        const expectedError = {
            statusCode: 404,
            body: expect.stringMatching("^.*\\\"message\\\":\\\"Path not found: key/poop\\\".*$"),
            headers: {
                "content-type": "application/json"
            }
        }
        expect(requestRouter.routeRequest(pathFail, "hi", {
            userEmail: "HI"
        })).resolves.toEqual(expectedError)
    });
});


describe.skip('routeRequest to blank path', function () {
  it("successfully create a key",
    async () => {
      expect.assertions(1);
      
   }
  );

  it("handle malformed body", 
    async () => {
        return 0
    }
  );

  it("handle dynamo error",
    async () => {
        return 0
    }
  );
});
