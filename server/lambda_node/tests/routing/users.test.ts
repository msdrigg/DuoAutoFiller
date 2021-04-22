import {describe, expect, it, jest } from '@jest/globals';
import { ResultOrError } from '../../layers/common';
import { CreationKey } from '../../layers/keys/model';
import { createDatabaseKey, getFrontendKey } from '../../layers/keys/mapping';
import { CoreUser, IUserRepository, UserAuthExternal, UserAuthVerifier, UserRouter, UserUpdate } from '../../layers/users';


const inputEmail = "fakeEmail1124309@fake.com";
const inputKey: CreationKey = {
  Context :{
    Name: "Bro",
    Site: "bro.com",
    CreationDate: Date.now()
  },
  Key: "32i4ufdlkfj",
};

class MockKeyRepository implements IUserRepository {
    mockFunction: (...args: unknown[]) => unknown;
    constructor(mockFunction: (...args: unknown[])=>unknown) {
        this.mockFunction = mockFunction;
    }
    getUser(userEmail: string): Promise<ResultOrError<CoreUser>> {
        this.mockFunction("getUser");
        return this.mockFunction(userEmail) as Promise<ResultOrError<CoreUser>>;
    }
    getAuthUser(userEmail: string): Promise<ResultOrError<UserAuthVerifier>> {
        this.mockFunction("getAuthUser");
        return this.mockFunction(userEmail) as Promise<ResultOrError<UserAuthVerifier>>;
    }
    createUser(user: UserAuthExternal): Promise<ResultOrError<CoreUser>> {
        this.mockFunction("createUser");
        return this.mockFunction(user) as Promise<ResultOrError<CoreUser>>;
    }
    updateUser(userEmail: string, changes: UserUpdate): Promise<ResultOrError<CoreUser>> {
        this.mockFunction("updateUser");
        return this.mockFunction(userEmail, changes) as Promise<ResultOrError<CoreUser>>;
    }
    deleteUser(userEmail: string): Promise<ResultOrError<void>> {
        this.mockFunction("deleteUser");
        return this.mockFunction(userEmail) as Promise<ResultOrError<void>>;
    }
}


describe('routeRequest with unknown route', function () {
    it("returns error as expected",
      async () => {
        expect.assertions(1);
        const nullRequestRouter = new UserRouter(null);
        
        const pathFail = ["poop"]
        const expectedError = {
            statusCode: 404,
            body: expect.stringMatching("^.*\\\"message\\\":\\\"Path not found: user/poop\\\".*$"),
            headers: {
                "content-type": "application/json"
            }
        }
        expect(nullRequestRouter.routeRequest(pathFail, "hi", {
            userEmail: "HI"
        })).resolves.toEqual(expectedError)
    });
});


describe('routeRequest to signup', function () {
    it.skip("successfully create a key",
        async () => {
        expect.assertions(5);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mockCreationFunction = jest.fn(async (..._args: any[]) => {
            return getFrontendKey(createDatabaseKey(inputEmail, inputKey))
        })
        const mockRepository = new MockKeyRepository(mockCreationFunction);
        const router = new UserRouter(mockRepository);
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


describe('routeRequest to update', function () {
    it.skip("successfully update user",
        async () => {
        expect.assertions(5);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mockCreationFunction = jest.fn(async (..._args: any[]) => {
            return getFrontendKey(createDatabaseKey(inputEmail, inputKey))
        })
        const mockRepository = new MockKeyRepository(mockCreationFunction);
        const router = new UserRouter(mockRepository);
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