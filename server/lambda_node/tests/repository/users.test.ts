import {describe, expect, beforeAll, afterAll, it} from '@jest/globals';
import userAccess from "../../layers/repository/userAccess";
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
import { AuthUser, CoreUser, UserUpdate } from '../../layers/model/users';
import { ErrorType, ResponsibleError } from '../../layers/model/common';
import { DatabaseUser } from '../../layers/repository/model/models';
import { cleanupTestDatabase, loadTestData, setupTestDatabase } from '../setup/setupTestDatabase';
import { createResponsibleError, getCoreUser } from '../../layers/repository/model/mapping';

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
        const frontUser: AuthUser = {
          Email: "validEmail@address.com",
          PasswordHash: "ase423lk4fdj",
          Context: {name: "valid man"},
        };
        await expect(userAccess.createUser(
          frontUser.Email,
          frontUser.PasswordHash,
          frontUser.Context,
          documentClient
        )).resolves.toStrictEqual({
          Email: frontUser.Email,
          Context: frontUser.Context
        });

        await expect(userAccess.getUser(
          frontUser.Email, documentClient
        )).resolves.toEqual({
          Email: frontUser.Email,
          Context: frontUser.Context
        });

        //console.log(JSON.stringify(testDataModel, null, 2));
        await expect(
          documentClient.send(
            new DeleteCommand({
              TableName: testDataModel.TableName,
              Key: {
                PKCombined: frontUser.Email,
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
        const frontUser: AuthUser = {
          Email: databaseUser.PKCombined,
          PasswordHash: "ase423lk4fdj",
          Context: {
            Name: "valid man"
          },
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorResponse = createResponsibleError(ErrorType.DatabaseError, "User with provided email already exists", 409) as any;
        errorResponse.reason = expect.any(Error);
        
        await expect(userAccess.createUser(
          frontUser.Email,
          frontUser.PasswordHash,
          frontUser.Context,
          documentClient
        )).resolves.toMatchObject(errorResponse);
      }
    );
});


describe('getUser', function () {
  it("Gets user successfully",
    async () => {
      expect.assertions(1);
      
      const validUser: CoreUser = getCoreUser(validUsers[0]);

      await expect(userAccess.getUser(
        validUser.Email, documentClient
      )).resolves.toStrictEqual(validUser);
    }
  );

  it("Gets user fails with not found",
    async () => {
      expect.assertions(1);
      const errorResponse: ResponsibleError = createResponsibleError(ErrorType.DatabaseError, "User not found in database", 404);

      await expect(userAccess.getUser(
        "INVALDEMAIL@NOTEXISTS.com", documentClient
      )).resolves.toMatchObject(errorResponse);
    }
  );
});

describe('deleteUser', function () {
  it.skip("Deletes user successfully",
    async () => {
      expect.assertions(1);
      
      const validUser: DatabaseUser = validUsers[0];

      await expect(userAccess.getUser(
        validUser.PKCombined, documentClient
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

      await expect(userAccess.updateUser(
        validUser.PKCombined, update, documentClient
      )).resolves.toStrictEqual(returnedUser);
    }
  );

  it.skip("Updates user email successfully", 
    async () => {
      expect.assertions(1);
      
      const validUser: DatabaseUser = validUsers[0];
      
      await expect(userAccess.getUser(
        validUser.PKCombined, documentClient
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

      await expect(userAccess.getUser(
        validUser.PKCombined, documentClient
      )).resolves.toStrictEqual({
        email: validUser.PKCombined,
        Context: validUser.Context
      });
    }
  )
});