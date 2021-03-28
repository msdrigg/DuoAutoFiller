import * as constants from "../utils/constants";
import * as httpUtils from "../utils/httpUtils";
import * as keyAccess from "../db_access/keyAccess";

async function routeRequest(routes, body, authorizer, dynamo) {
    // Route users requests 
    let route = 0
    if (routes.length > 0) {
        route = routes[0];
    }

    try {
        let userEmailAuthorized = authorizer.userEmail;

        switch (route) {
            case '':
                // Posting (updating or adding a key
                let frontendKey = JSON.parse(body);
                let createdKey = await keyAccess.createKey(frontendKey, userEmailAuthorized);

                return constants.OK_MODEL
            
            case 'findSinceTimestamp':
                // Find all keys (batch) since a timestamp. If not provided, find all
                let timestamp = JSON.parse(body).timestamp;

                let dateTime = undefined;
                if (timestamp) {
                    dateTime = Date.parse(timestamp);
                } 
                
                return keyAccess.getKeysSinceTime(userEmailAuthorized, dateTime, dynamo);
            
            case 'downloadAndUse':
                // Increment usageCounter and return the key atomically
                let requestBody = JSON.parse(body);
                let keyId = requestBody.id;
                
                return keyAccess.getAndIncrement(userEmailAuthorized, keyId, dynamo);

            default:
                throw new Error(`Unsupported path /key/"${route}"`);
        }
    } catch (err) {
        return httpUtils.getErrorResponseObject(err.message, 400);
    } 
}


export default {
    handleKeyRequest
};