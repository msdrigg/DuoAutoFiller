async function testCreateUser() {
  // Test create user successful
  // Test create user already exists
}
describe('createUser', function () {
    it.("Creates user",
    async () => {
        await testCreateUser() {

        }
    });
});

function testRefreshSession() {
  // Test key returned
  // Test dynamo fails
}

function testLogin() {
  // Test dynamo fails
  // Test session created
  // Test cookies returned
}

function testUpdateUserContext() {
  // Test update user context succeed
  // Test update user context dynamo fails
  // Test extra context
}

function testUpdateUserPassword() {
  // Test fail at each dynamo step and recovery
  // Test succeed
  // Test large number of sessions and keys
}

function testUpdateUserEmail() {
  // Test fail at each dynamo step and recovery
  // Test succeed
  // Test large number of sessions and keys
  // Test email already exists
}
