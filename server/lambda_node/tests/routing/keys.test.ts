import {describe, expect, it, jest } from '@jest/globals';
import { KeyRouter, CoreKey, IKeyRepository, KeyContext } from '../../layers/keys';
import { createResponsibleError, ErrorType, getErrorLambdaResponse, ResultOrError } from '../../layers/common';
import { CreationKey } from '../../layers/keys/model';
import { createDatabaseKey, getFrontendKey } from '../../layers/keys/mapping';


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
              expect(it.LastContentUpdate.getTime()/10000).toBeCloseTo(currentTime / 10000);
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

  it.skip("handle malformed body", 
    async () => {
        return 0
    }
  );

  it.skip("handle dynamo single error",
    async () => {
        return 0
    }
  );

  it.skip("handle dynamo persistant error",
    async () => {
        return 0
    }
  );
});


describe('routeRequest to "findSinceTimestamp', function () {
    it.skip("successfully download all keys",
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

    it.skip("successfully download limited keys",
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

  it.skip("handle malformed body", 
    async () => {
        return 0
    }
  );

  it.skip("handle dynamo single error",
    async () => {
        return 0
    }
  );

  it.skip("handle dynamo persistant error",
    async () => {
        return 0
    }
  );
});

describe('routeRequest to "downloadAndUse', function () {
    it.skip("successfully download and update key",
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
        expect.assertions(4);
        const mockFn = jest.fn(async (..._args: any[]) => {
            return null;
        })
        const mockRepository = new MockKeyRepository(mockFn);
        const router = new KeyRouter(mockRepository);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any

        const outputError = 
          createResponsibleError(
              ErrorType.BodyValidationError,
              "hi",
              400,
              new Error("Hi"),
          );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const outputResponse: any = getErrorLambdaResponse(
          outputError
        )
        outputResponse.body = expect.any(String)
        await expect(
            router.routeRequest([''], {
              Key: 10
            }, {
                userEmail: inputEmail
            })
        ).resolves.toEqual(
          outputResponse
        );
        await expect(
            router.routeRequest([''], {
              Context: "pee",
            }, {
                userEmail: inputEmail
            })
        ).resolves.toEqual(
          outputResponse
        );
        await expect(
            router.routeRequest([''], {
              Key: {
                hi:'hi'
              },
            }, {
                userEmail: inputEmail
            })
        ).resolves.toEqual(
          outputResponse
        );
        expect(mockFn).toBeCalledTimes(0)
    }
  );

  it.skip("handle dynamo single error",
    async () => {
        return 0
    }
  );

  it.skip("handle dynamo persistant error",
    async () => {
        return 0
    }
  );
});