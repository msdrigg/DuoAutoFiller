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
import { createHmac } from "crypto";
import { isError, createResponsibleError, ErrorType, ResponsibleError } from '../../layers/common';
import { CoreUser, UserAuthExternal, UserAuthVerifier, UserUpdate } from '../../layers/users';
import { getCoreUser } from '../../layers/users/mapping';
import { DatabaseUser, UserRepository } from '../../layers/users/repository';
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
const userRepository = new UserRepository(documentClient)
const testDataModel = loadTestData('./tests/setup/testData/AutoAuthenticateDatabase.json');
const validUsers: Array<DatabaseUser> = testDataModel.TableData
  .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
  .filter((it: DatabaseUser) => it.SKCombined.startsWith("M#"))


beforeAll(() => {
  return setupTestDatabase(testDataModel, documentClient);
}, 10000)
afterAll(() => {
  return cleanupTestDatabase(testDataModel, documentClient);
}, 10000)

describe('createUser', function () {
    it("Creates user successfully",
      async () => {
        expect.assertions(3);

        // Get valid frontendUser
        const userInput: UserAuthExternal = {
          Email: "validEmail@address.com",
          PasswordInput: "ase423lk4fdj",
          Context: {name: "valid man"},
        };
        await expect(userRepository.createUser(userInput)).resolves.toStrictEqual({
          Email: userInput.Email,
          Context: userInput.Context
        });

        await expect(userRepository.getUser(
          userInput.Email
        )).resolves.toEqual({
          Email: userInput.Email,
          Context: userInput.Context
        });

        //console.log(JSON.stringify(testDataModel, null, 2));
        await expect(
          documentClient.send(
            new DeleteCommand({
              TableName: testDataModel.TableName,
              Key: {
                PKCombined: userInput.Email,
                SKCombined: "M#"
              }
            })
          )
        ).resolves.toBeTruthy();
      }
    );

    it("Creates user successfully with verified user hash",
      async () => {
        expect.assertions(3);
        // Get valid frontendUser
        const userInput: UserAuthExternal = {
          Email: "validEmail@address.com",
          PasswordInput: "ase423lk4fdj",
          Context: {name: "valid man"},
        };
        await expect(userRepository.createUser(userInput)).resolves.toStrictEqual({
          Email: userInput.Email,
          Context: userInput.Context
        });

        await expect(userRepository.getAuthUser(
          userInput.Email
        ).then(result => {
          if (!isError(result)) {
            const hash = createHmac(result.PasswordInfo.HashFunction, result.PasswordInfo.Salt);
            hash.update(userInput.PasswordInput);
            const expectedHash = hash.digest('hex');
            return expectedHash == result.PasswordInfo.StoredHash;
          } else {
            return false
          }
        })).resolves.toBeTruthy();

        await expect(
          documentClient.send(
            new DeleteCommand({
              TableName: testDataModel.TableName,
              Key: {
                PKCombined: userInput.Email,
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
        const databaseUser = validUsers[0];
        const userInput: UserAuthExternal = {
          Email: databaseUser.PKCombined,
          PasswordInput: "ase423lk4fdj",
          Context: {
            Name: "valid man"
          },
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorResponse = createResponsibleError(ErrorType.DatabaseError, "User with provided email already exists", 409) as any;
        errorResponse.reason = expect.any(Error);
        
        await expect(userRepository.createUser(userInput)).resolves.toMatchObject(errorResponse);
      }
    );
});


describe('getUser', function () {
  it("Gets user successfully",
    async () => {
      expect.assertions(1);
      
      const validUser: CoreUser = getCoreUser(validUsers[0]);

      await expect(userRepository.getUser(
        validUser.Email
      )).resolves.toStrictEqual(validUser);
    }
  );

  it("Gets user fails with not found",
    async () => {
      expect.assertions(1);
      const errorResponse: ResponsibleError = createResponsibleError(ErrorType.DatabaseError, "User not found in database", 404);

      await expect(userRepository.getUser(
        "INVALDEMAIL@NOTEXISTS.com"
      )).resolves.toMatchObject(errorResponse);
    }
  );
});


describe('getAuthUserVerifier', function () {
  it("Gets user successfully",
    async () => {
      expect.assertions(1);
      
      const databaseUser = validUsers[0];
      const validUser: UserAuthVerifier = {
        Email: databaseUser.PKCombined,
        PasswordInfo: databaseUser.PasswordInfo,
        Context: databaseUser.Context
      }

      await expect(userRepository.getAuthUser(
        validUser.Email
      )).resolves.toStrictEqual(validUser);
    }
  );

  it("Gets user fails with not found",
    async () => {
      expect.assertions(1);
      const errorResponse: ResponsibleError = createResponsibleError(ErrorType.DatabaseError, "User not found in database", 404);

      await expect(userRepository.getUser(
        "INVALDEMAIL@NOTEXISTS.com"
      )).resolves.toMatchObject(errorResponse);
    }
  );
});
describe('deleteUser', function () {
  it.skip("Deletes user successfully",
    async () => {
      expect.assertions(1);
      
      const validUser: DatabaseUser = validUsers[0];

      await expect(userRepository.getUser(
        validUser.PKCombined
      )).resolves.toStrictEqual({
        email: validUser.PKCombined,
        Context: validUser.Context
      });
    }
  );
});

describe('updateUser', function () {
  it("Updates user Context successfully",
    async () => {
      expect.assertions(1);
      
      const validUser: DatabaseUser = validUsers.find(
        (user: DatabaseUser) => {
          return user.Context.Name !== undefined
        });
      
      const update: UserUpdate = {
        Context: {
          Name: "New name",
          Phone: "new Phone",
          Butthole: "got one"
        }
      }
      const returnedUser = getCoreUser(validUser);
      returnedUser.Context = update.Context;

      await expect(userRepository.updateUser(
        validUser.PKCombined, update
      )).resolves.toStrictEqual(returnedUser);
    }
  );

  it.skip("Updates user email successfully", 
    async () => {
      expect.assertions(1);
      
      const validUser: DatabaseUser = validUsers[0];
      
      await expect(userRepository.getUser(
        validUser.PKCombined
      )).resolves.toStrictEqual({
        email: validUser.PKCombined,
        Context: validUser.Context
      });
    }
  )

  it.skip("Updates user password successfully", 
    async () => {
      expect.assertions(1);
      
      const validUser: DatabaseUser = validUsers[0];

      await expect(userRepository.getUser(
        validUser.PKCombined
      )).resolves.toStrictEqual({
        email: validUser.PKCombined,
        Context: validUser.Context
      });
    }
  )
});