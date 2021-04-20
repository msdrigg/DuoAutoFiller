import {describe, expect, beforeAll, afterAll, it} from '@jest/globals';
import keyAccess from "../../layers/repository/keyAccess";
import { 
  DynamoDBClient,
  DynamoDBClientConfig,
  AttributeValue,
} from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  unmarshall
} from "@aws-sdk/util-dynamodb";
import { FrontendKey, KeyContext } from '../../layers/model/keys';
import { DatabaseKey, DatabaseUser } from '../../layers/repository/model/models';
import { cleanupTestDatabase, loadTestData, setupTestDatabase } from '../setup/setupTestDatabase';
import { TABLE_NAME } from '../../layers/utils/constants';
import { getDatabaseKey, getFrontendKey } from '../../layers/repository/model/mapping';

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
  .filter((it: DatabaseUser) => it.SKCombined == "M#")
const validKeys: Array<DatabaseKey> = testDataModel.TableData
  .map((it: { [key: string]: AttributeValue; }) => unmarshall(it))
  .filter((it: DatabaseUser) => it.SKCombined.startsWith("K#"))

beforeAll(() => {
  return setupTestDatabase(testDataModel, documentClient);
}, 10000)
afterAll(() => {
  return cleanupTestDatabase(testDataModel, documentClient);
}, 10000)

describe('createKey', function () {
    it("Creates key successfully",
      async () => {
        expect.assertions(3);

        // Get valid inputKey
        const userEmail = "msd@gemail.com"
        const inputKey: FrontendKey = {
          Key: "23948fsdkf",
          Id: "203974fjsldf",
          Context: {
              Name: "testKey",
              Site: "newste",
              CreationDate: new Date().getTime()
           },
          UseCounter: 0,
          LastContentUpdate: new Date()
        };
        // Assert that they key creation functino returns input key
        await expect(keyAccess.createKey(userEmail, inputKey, documentClient))
            .resolves.toStrictEqual(inputKey);

        // Assert that the key can be found in the database
        await expect(documentClient.send(new GetCommand({
            TableName: TABLE_NAME,
            Key: {
                PKCombined: userEmail,
                SKCombined: "K#" + inputKey.Id
            }
        })).then(it => {
          return it.Item
        })).resolves.toStrictEqual(getDatabaseKey(userEmail, inputKey));

        // Assert that we can delete the new key
        await expect(
          documentClient.send(
            new DeleteCommand({
              TableName: testDataModel.TableName,
              Key: {
                PKCombined: userEmail,
                SKCombined: "K#" + inputKey.Id
              }
            })
          )
        ).resolves.toBeTruthy();
      }
    );

    it.skip("Create key fails with dynamo error", 
      async () => {
        return 0
      }
    );
});


describe('getKeysSinceTime', function () {
  it("Gets all keys successfully for a user who has at least two keys",
    async () => {
      expect.assertions(1);
      
      const userWithTwoKeys: DatabaseUser = validUsers.find(user => {
        return validKeys.filter(key => {
          return key.PKCombined == user.PKCombined
        }).length >= 2;
      });
      const usersKeys: Array<FrontendKey> = validKeys.filter(key => {
        return key.PKCombined == userWithTwoKeys.PKCombined
      }).map(key => {
        return getFrontendKey(key);
      });
      await expect(keyAccess.getKeysSinceTime(
        userWithTwoKeys.PKCombined, undefined,  documentClient
      )).resolves.toStrictEqual(usersKeys);
    }
  );

  it("Gets all keys successfully for a user who has no keys",
    async () => {
      expect.assertions(1);
      
      const userWithNoKeys: DatabaseUser = validUsers.find(user => {
        return validKeys.find(key => {
          return key.PKCombined == user.PKCombined
        }) === undefined;
      });
      await expect(keyAccess.getKeysSinceTime(
        userWithNoKeys.PKCombined, undefined, documentClient
      )).resolves.toStrictEqual([]);
    }
  );

  it("Get 0 keys for a user with 2 keys filtered by time",
    async () => {
      expect.assertions(1);
      const userWithTwoKeys: DatabaseUser = validUsers.find(user => {
        return validKeys.filter(key => {
          return key.PKCombined == user.PKCombined
        }).length >= 2;
      });
      
      await expect(keyAccess.getKeysSinceTime(
        userWithTwoKeys.PKCombined, new Date(8640000000000000), documentClient
      )).resolves.toStrictEqual([]);
    }
  );

  it("Get 1 keys for a user with at least 2 keys filtered by time",
    async () => {
      expect.assertions(2);
      const userWithTwoOrMoreKeys: DatabaseUser = validUsers.find(user => {
        return validKeys.filter(key => {
          return key.PKCombined == user.PKCombined
        }).length >= 2;
      });
      const usersKeys: Array<DatabaseKey> = validKeys.filter(key => {
        return key.PKCombined == userWithTwoOrMoreKeys.PKCombined
      });
      const inBetweenTime = usersKeys.reduce(function (accumulator, currentValue) {
        return accumulator + currentValue.Temporal / 1000
      }, 0) / usersKeys.length * 1000;
      const expectedKeys = usersKeys.filter(key => {
        return key.Temporal > inBetweenTime
      }).map(key => {
        return getFrontendKey(key)
      });

      expect(expectedKeys.length).toBeLessThan(usersKeys.length);
      await expect(keyAccess.getKeysSinceTime(
        userWithTwoOrMoreKeys.PKCombined, new Date(inBetweenTime), documentClient
      )).resolves.toStrictEqual(expectedKeys);
    }
  );
  
  it.skip("Get key fails with dynamo error", 
    async () => {
      return 0
    }
  );
});

describe('deleteKey', function () {
  it("Deletes key successfully",
    async () => {
      expect.assertions(4);
        // Get valid frontendUser
        const userEmail = validUsers[0].PKCombined;
        const databaseKey = getDatabaseKey(
          userEmail, 
          {
            LastContentUpdate: new Date(),
            UseCounter: 0,
            Context: {
              Name: "testSesh",
              Site: null,
              CreationDate: 10039430
            },
            Key: "hehe3k23k",
            Id: "flk2j32f"
          }
        );

        // First of all expect that the put command works
        await expect(documentClient.send(
          new PutCommand({
            TableName: TABLE_NAME,
            Item: databaseKey
          })
        )).resolves.toBeTruthy();

        // Expect key to exist initially
        await expect(documentClient.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: {
              PKCombined: userEmail,
              SKCombined: databaseKey.SKCombined
            }
          })
        ).then(item => {
          return item.Item
        })).not.toBeUndefined();

        // // Expect delete key to resolve
        await expect(keyAccess.deleteKey(
          userEmail, databaseKey.SKCombined.slice(2), documentClient)
        ).resolves.toBeUndefined()

        // Make sure the key does not exist anymore
        await expect(documentClient.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: {
              PKCombined: userEmail,
              SKCombined: databaseKey.SKCombined
            }
          })
        ).then(it => {
          return it.Item
        })).resolves.toBeUndefined();
      }
    );
  it.skip("Delete key fails with dynamo error", 
    async () => {
      return 0
    }
  );
});

describe('getAndIncrement', function () {
  it("Gets and increments key counter",
    async () => {
      expect.assertions(3);
      
      const incrementedKey = validKeys[0];
      const newKey = getFrontendKey(incrementedKey);
      newKey.UseCounter = newKey.UseCounter + 1;
      const newDatabaseKey = getDatabaseKey(incrementedKey.PKCombined, newKey)

      // Assert that the increment function returns well
      await expect(keyAccess.getAndIncrement(
        incrementedKey.PKCombined, incrementedKey.SKCombined.slice(2), documentClient
      )).resolves.toStrictEqual(
        newKey
      );

      // Assert that the key is really changed in the database
      await expect(documentClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PKCombined: incrementedKey.PKCombined,
          SKCombined: incrementedKey.SKCombined
        }
      })).then(item => {
        return item.Item;
      })).resolves.toEqual(newDatabaseKey)

      // Assert that we can put the key back to its original state (dont want tests to change database)
      await expect(documentClient.send( new PutCommand({
        TableName: TABLE_NAME,
        Item: incrementedKey
      }))).resolves.toBeTruthy();
    }
  );

  it.skip("Get and increment fails with dynamo error", 
    async () => {
      return 0;
    }
  );
})

describe('updateKeyContext', function () {
  it("Updates key Context successfully",
    async () => {
      expect.assertions(2);

      const validKey: DatabaseKey = validKeys[0];
      const newKeyContext: KeyContext = {
        Name: "New name",
        Content: "new content",
        CreationDate: 222,
        Site: null,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newKey = getFrontendKey(validKey) as any;
      newKey.LastContentUpdate = expect.any(Date);
      newKey.Context = expect.objectContaining(newKeyContext);

      await expect(keyAccess.updateKeyContext(
        validKey.PKCombined, validKey.SKCombined.slice(2), newKeyContext, documentClient
      )).resolves.toEqual(
        newKey
      );

      await expect(
        documentClient.send(new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            SKCombined: validKey.SKCombined,
            PKCombined: validKey.PKCombined
          }
        })).then(result => {
          return getFrontendKey(result.Item as DatabaseKey)
        })
      ).resolves.toEqual(
        newKey
      )
    }
  );

  it.skip("Update key context fails with dynamo error", 
    async () => {
      return 0;
    }
  );
});
