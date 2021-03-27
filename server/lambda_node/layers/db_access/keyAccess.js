const typedefs = require("../utils/typedefs");


/**
 * Gets the backend key given the frontend key
 * 
 * @param {typedefs.FrontendKey} [frontendKey] The frontend key
 * @param {string} userEmail
 * 
 * @returns {typedefs.DatabaseKey} The user created, undefined if the user fails to be created
 */
function getBackendKey(frontendKey, userEmail) {
    return {
        encryptedData: frontendKey.encryptedData,
        PKCombined: userEmail,
        SKCombined: "K#" + frontendKey.id,
        context: frontendKey.context,
        temporal: new Date().toISOString(),
        useCounter: frontendKey.useCounter
    };
}

/**
 * Gets the frontend key given the backend key
 * 
 * @param {typedefs.DatabaseKey} [backendKey] The email for the user
 * 
 * @returns {typedefs.FrontendKey} The user created, undefined if the user fails to be created
 */
function getFrontentKey(backendKey) {
    return {
        encryptedData: backendKey.encryptedData,
        id: backendKey.SKCombined.slice(2),
        context: backendKey.context,
        lastContentUpdate: backendKey.temporal,
        useCounter: backendKey.useCounter
    };
}

export default {
    getBackendKey,
    getFrontentKey
};