import {describe, expect, beforeAll, afterAll, it} from '@jest/globals';
import { 
  DynamoDBClient,
  DynamoDBClientConfig,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb';
import { authorizeUser } from '../../layers/authorization';
import { LambdaAuthorization } from '../../layers/authorization/model';
import { UserAuthExternal, UserRepository } from '../../layers/users';
import { loadTestData, setupTestDatabase, cleanupTestDatabase } from '../setup/setupTestDatabase';
import { httpUtils } from '../../layers/common';

const config: DynamoDBClientConfig = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
      accessKeyId: "xxxxxx",
      secretAccessKey: "xxxxxx"
    }
}
const documentClient = DynamoDBDocumentClient.from(new DynamoDBClient(config));
const userRepository = new UserRepository(documentClient);
const testDataModel = loadTestData('./tests/setup/testData/AutoAuthenticateDatabase.json');


beforeAll(() => {
  return setupTestDatabase(testDataModel, documentClient);
}, 10000)
afterAll(() => {
  return cleanupTestDatabase(testDataModel, documentClient);
}, 10000)

describe('authorizeUser', function () {
    const challenge: UserAuthExternal = {
      Email: "validEmail@address.com",
      PasswordInput: "ase423lk4fdj",
      Context: {name: "valid man"},
    };

    beforeAll(() => {
      return userRepository.createUser(challenge);
    })

    afterAll(() => {
      return documentClient.send(
        new DeleteCommand({
          TableName: testDataModel.TableName,
          Key: {
            PKCombined: challenge.Email,
            SKCombined: "M#"
          }
        })
      )
    })

    it("Authorize user successfully",
      async () => {
        expect.assertions(1);

        const authorized: LambdaAuthorization = {
          isAuthorized: true,
          context: {
            userEmail: challenge.Email
          }
        };
        const header = `Basic ${httpUtils.encodeUnicode(challenge.Email + ":" + challenge.PasswordInput)}`
        await expect(authorizeUser(userRepository, header))
          .resolves.toEqual(authorized);
      }
    );

    it("Authorize user fails with user not exists",
      async () => {
        expect.assertions(1);

        const fakeTrial = {
          ...challenge
        };
        fakeTrial.Email = "blahbalhsd@ggg.comk"
        const unAuthorized: LambdaAuthorization = {
          isAuthorized: false,
        };
        const header = `Basic ${httpUtils.encodeUnicode(fakeTrial.Email + ":" + fakeTrial.PasswordInput)}`
        await expect(authorizeUser(userRepository, header))
          .resolves.toEqual(unAuthorized);
      }
    );

    it("Authorize user fails with password hash not matches",
        async () => {
        expect.assertions(1);

        const fakeTrial = {
          ...challenge,
          PasswordInput: "23flk23flkj23f"
        };
        const unAuthorized: LambdaAuthorization = {
          isAuthorized: false,
        };
        const header = `Basic ${httpUtils.encodeUnicode(fakeTrial.Email + ":" + fakeTrial.PasswordInput)}`
        await expect(authorizeUser(userRepository, header))
          .resolves.toEqual(unAuthorized);
      }
    );
});