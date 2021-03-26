import * as constants from "constants";

MAX_SESSION_LENGTH_SECONDS = 30*24*3600;


async function getSession(userEmail, sessionId, dynamo) {
    let session = await dynamo.get({
        TableName: constants.TABLE_NAME,
        Key: {
            PKCombined: userEmail,
            SKCombined: "S#" + sessionId
        }
    }).promise();

    return frontendSession = {
        key: session.key,
        id: sessionId,
        context: session.context
    }
}

async function createSession(userEmail, sessionId, sessionName, expirationDate, dynamo) {
    let sessionObject = {
        PKCombined: userEmail,
        SKCombined: "S#" + sessionId,
        context: {
            name: sessionName
        },
        temporal: new Date(expirationDate).toISOString()
    };
    return await dynamo.put({
        TableName: TABLE_NAME,
        Item: sessionObject
    }).promise();
}