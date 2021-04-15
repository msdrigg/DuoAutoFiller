"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
var globals_1 = require("@jest/globals");
var userAccess_js_1 = require("./../layers/db_access/userAccess.js");
var AWS = require('aws-sdk');
var dynamodb_1 = require("aws-sdk/clients/dynamodb");
var fs = require('fs');
AWS.config.update({
    region: "us-east-1",
    endpoint: "http://localhost:8000"
});
var dynamodb = new AWS.DynamoDB();
var documentClient = new AWS.DynamoDB.DocumentClient();
var testDataModel = JSON.parse(fs.readFileSync('./testData/testDatabase.json', 'utf8')).DataModel;
function setupTestDatabase(dataModel, dynamodb) {
    createTestDatabase(dataModel, dynamodb);
    addTestItems(dataModel, dynamodb);
}
function cleanupTestDatabase(dataModel, dynamodb) {
    dynamodb.deleteTable({
        TableName: dataModel.TableName
    });
}
function addTestItems(dataModel, dynamodb) {
    dataModel.TableData.forEach(function (item) {
        dynamodb.putItem({
            TableName: dataModel.TableName,
            Item: item
        }, function (err, data) {
            if (err) {
                console.error("Unable to add item", JSON.stringify(item, null, 2), ". Error JSON:", JSON.stringify(err, null, 2));
            }
            else {
                console.log("PutItem succeeded");
            }
        });
    });
}
function createTestDatabase(dataModel, dynamodb) {
    var dataModelFormatted = formatKeySchema(dataModel);
    dataModelFormatted.GlobalSecondaryIndexes = dataModel.GlobalSecondaryIndexes.map(function (idx) {
        var newSI = formatKeySchema(idx);
        newSI.ProvisionedThroughput = {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10
        };
        return newSI;
    });
    dataModelFormatted.AttributeDefinitions = dataModelFormatted.NonKeyAttributes;
    delete dataModelFormatted["NonKeyAttributes"];
    delete dataModelFormatted["DataAccess"];
    delete dataModelFormatted["TableData"];
    dataModelFormatted.ProvisionedThroughput = {
        ReadCapacityUnits: 10,
        WriteCapacityUnits: 10
    };
    dynamodb.createTable(dataModelFormatted, function (err, data) {
        if (err) {
            console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
        }
        else {
            console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
        }
    });
}
function formatKeySchema(dataModel) {
    var attributes = dataModel.KeyAttributes;
    if (attributes === undefined) {
        return dataModel;
    }
    else {
        var dataCopy = __assign({}, dataModel);
        var newAttributes = [
            {
                AttributeName: attributes.PartitionKey.AttributeName,
                KeyType: "HASH"
            },
            {
                AttributeName: attributes.SortKey.AttributeName,
                KeyType: "RANGE"
            } // Sort Key
        ];
        dataCopy.KeySchema = newAttributes;
        delete dataCopy['KeyAttributes'];
        return dataCopy;
    }
}
globals_1.beforeEach(function () {
    setupTestDatabase(dynamodb, testDataModel);
});
globals_1.afterEach(function () {
    cleanupTestDatabase(dynamodb, testDataModel);
});
globals_1.describe('createUser', function () {
    var _this = this;
    globals_1.it("Creates user successfully", function () { return __awaiter(_this, void 0, void 0, function () {
        var frontUser;
        return __generator(this, function (_a) {
            frontUser = {
                email: "validEmail@address.com",
                passwordHash: "ase423lk4fdj",
                context: {
                    name: "valid man"
                }
            };
            globals_1.expect(userAccess_js_1["default"].createUser(frontUser.email, frontUser.passwordHash, frontUser.context, documentClient)).resolves.toReturn;
            globals_1.expect(userAccess_js_1["default"].getUser(frontUser.email, documentClient)).resolves.toBe(frontUser);
            return [2 /*return*/];
        });
    }); });
    globals_1.it("Creates user fails with conflict", function () { return __awaiter(_this, void 0, void 0, function () {
        var frontUser;
        return __generator(this, function (_a) {
            frontUser = {
                email: testDataModel.TableData.filter(function (it) { return it.SKCombined == "M#"; })[0].PKCombined.S,
                passwordHash: "ase423lk4fdj",
                context: {
                    name: "valid man"
                }
            };
            globals_1.expect(userAccess_js_1["default"].createUser(frontUser.email, frontUser.passwordHash, frontUser.context, documentClient)).resolves.toBe(undefined);
            return [2 /*return*/];
        });
    }); });
});
globals_1.describe('getUser', function () {
    var _this = this;
    globals_1.it("Gets user successfully", function () { return __awaiter(_this, void 0, void 0, function () {
        var validUser;
        return __generator(this, function (_a) {
            validUser = dynamodb_1.Converter.unmarshall(testDataModel.TableData.filter(function (it) { return it.SKCombined == "M#"; })[0]);
            globals_1.expect(userAccess_js_1["default"].getUser(validUser.PKCombined, documentClient)).resolves.toBe(validUser);
            return [2 /*return*/];
        });
    }); });
    globals_1.it("Gets user fails with not found", function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            globals_1.expect(userAccess_js_1["default"].getUser("INVALDEMAIL@NOTEXISTS.com", documentClient)).resolves.toBe(undefined);
            return [2 /*return*/];
        });
    }); });
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
