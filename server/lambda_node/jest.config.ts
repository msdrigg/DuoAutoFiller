module.exports = {
    transform: {
        '^.+\\.ts?$': 'ts-jest',
        "^.+\\.js?$": "babel-jest", // Adding this line solved the issue
    },
    testEnvironment: 'node',
    testRegex: '/tests/.*\\.(test|spec)?\\.(ts|tsx)$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node']
  };