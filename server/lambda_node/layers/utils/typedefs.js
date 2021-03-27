// typedefs.js


// USER OBJECTS
/**
 * @typedef FrontendUser
 * @property {string} [email] Users email in plain text
 * @property {PasswordInfo} [passwordInfo] The information to validate a users password securely
 * @property {Date} [signupDate] The date that the user signed up
 * @property {UserContext} [context] Useful context on the user
 */

/**
 * @typedef DatabaseUser
 * @property {string} PKCombined
 * @property {string} SKCombined
 * @property {PasswordInfo} passwordInfo
 * @property {UserContext} context
 * @property {string} temporal
 */

/**
 * @typedef UserContext
 * @property {string} name
 */

/**
 * @typedef PasswordInfo
 * @property {string} [storedHash] The hash of the users password
 * @property {string} [hashFunction] String identifying the hash function used to create the hash
 * @property {string} [salt] String salting the password
 */

// SESSION OBJECTS
/**
 * @typedef FrontendSession
 * @property {string} [id] The id of the session
 * @property {string} [key] The key for the session
 * @property {SessionContext} [context] The context containing userful information
 * @property {Date} [expiration] The expiration of the session
 */

/**
 * @typedef DatabaseSession
 * @property {string} PKCombined
 * @property {string} SKCombined
 * @property {SessionContext} context
 * @property {string} temporal
 */

/**
 * @typedef SessionContext
 * @property {string} [name] The name of the session
 */

// KEY OBJECTS
/**
 * @typedef FrontendKey
 * @property {string} encryptedData
 * @property {string} id
 * @property {KeyContext} context
 * @property {Date} lastContentUpdate 
 * @property {number} useConter
 */

/**
 * @typedef DatabaseKey
 * @property {string} PKCombined
 * @property {string} SKCombined
 * @property {KeyContext} context
 * @property {string} temporal
 * @property {number} useCounter
 */

/**
 * @typedef KeyContext
 * @property {string} name
 * @property {string} site
 * @property {string} creationDate
 */

// ERROR OBJECTS
/**
 * @typedef ErrorResponse
 * @property {string} [message] Error message
 * @property {number} [statusCode] Status code
 */

/**
 * @typedef DynamoError
 * @property {string} [code] The code identifying the error that occured
 * @property {boolean} [retryable] Whether or not the operation can succeed if retried
 * @property {number} [statusCode] The response code from the service
 * @property {Date} [time] The date time from when the error occured
 * @property {string} [hostname] Set when networking error occurs to identify the endpoint
 * @property {string} [region] Set when networkoing error occurs to identify the region
 */

/**
 * @typedef LambdaAuthorization
 * @property {boolean} isAuthorized
 * @property {AuthorizationContext} context
 */

/**
 * @typedef AuthorizationContext
 * @property {string} userEmail
 */
export const unused = {};