import {describe, expect, it, jest } from '@jest/globals';
import { createResponsibleError, ErrorType, getErrorLambdaResponse, ResultOrError } from '../../layers/common';
import { CreationKey } from '../../layers/keys/model';
import { createDatabaseKey, getFrontendKey } from '../../layers/keys/mapping';
import { CoreSession, ISessionRepository, SessionRouter } from '../../layers/sessions';


const inputEmail = "fakeEmail1124309@fake.com";
const inputKey: CreationKey = {
  Context :{
    Name: "Bro",
    Site: "bro.com",
    CreationDate: Date.now()
  },
  Key: "32i4ufdlkfj",
};

class MockKeyRepository implements ISessionRepository {
    mockFunction: (...args: unknown[]) => unknown;
    constructor(mockFunction: (...args: unknown[])=>unknown) {
        this.mockFunction = mockFunction;
    }
    getSession(userEmail: string, sessionId: string): Promise<ResultOrError<CoreSession>> {
        this.mockFunction("getSession");
        return this.mockFunction(userEmail, sessionId) as Promise<ResultOrError<CoreSession>>;
    }
    createSession(userEmail: string, sessionId: string, sessionName: string, expirationDate: Date): Promise<ResultOrError<CoreSession>> {
        this.mockFunction("createKey");
        return this.mockFunction(userEmail, sessionId, sessionName, expirationDate) as Promise<ResultOrError<CoreSession>>;
    }
    deleteSession(userEmail: string, sessionId: string): Promise<ResultOrError<void>> {
        this.mockFunction("deleteSession");
        return this.mockFunction(userEmail, sessionId) as Promise<ResultOrError<void>>;
    }
}


describe('routeRequest with unknown route', function () {
    it("returns error as expected",
      async () => {
        expect.assertions(1);
        const nullRequestRouter = new SessionRouter(null);
        
        const pathFail = ["poop"]
        const expectedError = {
            statusCode: 404,
            body: expect.stringMatching("^.*\\\"message\\\":\\\"Path not found: session/poop\\\".*$"),
            headers: {
                "content-type": "application/json"
            }
        }
        expect(nullRequestRouter.routeRequest(pathFail, "hi", {
            userEmail: "HI"
        })).resolves.toEqual(expectedError)
    });
});


describe('routeRequest to resfreshSession', function () {
    it.skip("successfully returns the session",
        async () => {
            expect.assertions(5);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mockCreationFunction = jest.fn(async (..._args: any[]) => {
                return getFrontendKey(createDatabaseKey(inputEmail, inputKey))
            })
            const mockRepository = new MockKeyRepository(mockCreationFunction);
            const router = new SessionRouter(mockRepository);
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


describe('routeRequest to login', function () {
    it.skip("Successfully create new session and return cookies",
        async () => {
            expect.assertions(5);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mockCreationFunction = jest.fn(async (..._args: any[]) => {
                return getFrontendKey(createDatabaseKey(inputEmail, inputKey))
            })
            const mockRepository = new MockKeyRepository(mockCreationFunction);
            const router = new SessionRouter(mockRepository);
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

    it.skip("successfully caps session length",
        async () => {
            expect.assertions(5);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mockCreationFunction = jest.fn(async (..._args: any[]) => {
                return getFrontendKey(createDatabaseKey(inputEmail, inputKey))
            })
            const mockRepository = new MockKeyRepository(mockCreationFunction);
            const router = new SessionRouter(mockRepository);
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

    it.skip("successfully creates browser session with correct",
        async () => {
            expect.assertions(5);
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mockCreationFunction = jest.fn(async (..._args: any[]) => {
                return getFrontendKey(createDatabaseKey(inputEmail, inputKey))
            })
            const mockRepository = new MockKeyRepository(mockCreationFunction);
            const router = new SessionRouter(mockRepository);
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
            const router = new SessionRouter(mockRepository);
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
                router.routeRequest(['login'], {
                Length: 10
                }, {
                    userEmail: inputEmail
                })
            ).resolves.toEqual(
            outputResponse
            );
            await expect(
                router.routeRequest(['login'], {
                Name: 10,
                }, {
                    userEmail: inputEmail
                })
            ).resolves.toEqual(
            outputResponse
            );
            await expect(
                router.routeRequest(['login'], {
                Name: {
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