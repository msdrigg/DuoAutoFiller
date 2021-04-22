import {describe, expect, beforeAll, afterAll, it, jest } from '@jest/globals';
import { 
  DynamoDBClient,
  DynamoDBClientConfig,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { KeyRouter, CoreKey, IKeyRepository, KeyContext } from '../../layers/keys';
import { loadTestData, setupTestDatabase, cleanupTestDatabase } from '../setup/setupTestDatabase';
import { ResultOrError } from '../../layers/common';
import { CreationKey } from '../../layers/keys/model';
import { createDatabaseKey, getFrontendKey } from '../../layers/keys/mapping';


const config: DynamoDBClientConfig = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
      accessKeyId: "xxxxxx",
      secretAccessKey: "xxxxxx"
    }
} 

const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient(config));
const testDataModel = loadTestData('./tests/setup/testData/AutoAuthenticateDatabase.json');

const inputEmail = "fakeEmail1124309@fake.com";
const inputKey: CreationKey = {
  Context :{
    Name: "Bro",
    Site: "bro.com",
    CreationDate: Date.now()
  },
  Key: "32i4ufdlkfj",
};

class MockKeyRepository implements IKeyRepository {
    mockFunction: (...args: unknown[]) => unknown;
    constructor(mockFunction: (...args: unknown[])=>unknown) {
        this.mockFunction = mockFunction;
    }

    createKey(userEmail: string, frontendKey: CoreKey): Promise<ResultOrError<CoreKey>> {
        this.mockFunction("createKey");
        return this.mockFunction(userEmail, frontendKey) as Promise<ResultOrError<CoreKey>>;
    }
    getKeysSinceTime(userEmail: string, cuttoffDate: Date): Promise<ResultOrError<CoreKey[]>> {
        this.mockFunction("getKeysSinceTime");
        return this.mockFunction(userEmail, cuttoffDate) as Promise<ResultOrError<CoreKey[]>>;
    }
    getAndIncrement(userEmail: string, keyId: string): Promise<ResultOrError<CoreKey>> {
        this.mockFunction("getAndIncrement");
        return this.mockFunction(userEmail, keyId) as Promise<ResultOrError<CoreKey>>;
    }
    deleteKey(userEmail: string, keyId: string): Promise<ResultOrError<void>> {
        this.mockFunction("deleteKey");
        return this.mockFunction(userEmail, keyId) as Promise<ResultOrError<void>>;
    }
    updateKeyContext(userEmail: string, keyId: string, updatedContext: KeyContext): Promise<ResultOrError<CoreKey>> {
        this.mockFunction("updateKeyContext");
        return this.mockFunction(userEmail, keyId, updatedContext) as Promise<ResultOrError<CoreKey>>;
    }
}
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
        const nullRequestRouter = new KeyRouter(null);
        
        const pathFail = ["poop"]
        const expectedError = {
            statusCode: 404,
            body: expect.stringMatching("^.*\\\"message\\\":\\\"Path not found: key/poop\\\".*$"),
            headers: {
                "content-type": "application/json"
            }
        }
        expect(nullRequestRouter.routeRequest(pathFail, "hi", {
            userEmail: "HI"
        })).resolves.toEqual(expectedError)
    });
});


describe('routeRequest to blank path', function () {
    it("successfully create a key",
        async () => {
        expect.assertions(5);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mockCreationFunction = jest.fn(async (..._args: any[]) => {
            return getFrontendKey(createDatabaseKey(inputEmail, inputKey))
        })
        const mockRepository = new MockKeyRepository(mockCreationFunction);
        const router = new KeyRouter(mockRepository);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any

        const outputKeyChecker = {
          ...inputKey,
          Id: expect.any(String),
          LastContentUpdate: expect.any(Date),
          UseCounter: 0,
        }
        const currentTime = Date.now();
        await expect(
            router.routeRequest([''], inputKey, {
                userEmail: inputEmail
            }).then((it: {LastContentUpdate: Date})=> {
              expect(it.LastContentUpdate.getTime()/1000).toBeCloseTo(currentTime / 1000);
              return it;
            })
        ).resolves.toEqual(outputKeyChecker)

        expect(mockCreationFunction).toBeCalledTimes(2);
        expect(mockCreationFunction).toBeCalledWith("createKey");
        expect(mockCreationFunction).toBeCalledWith(
            inputEmail, inputKey
        )
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
