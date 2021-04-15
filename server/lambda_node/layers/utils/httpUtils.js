var crypto = require("crypto");
const typedefs = require("./typedefs");

/**
 * Returns the error response object cooresponding to the provided message and code
 * 
 * @param {string} message
 * @param {number} code
 * 
 * @returns {typedefs.ErrorResponse} The error object with fields (body, statusCode)
 */
function getErrorResponseObject(message, code) {
    return {
        body: {"ErrorMessage": message},
        statusCode: code
    };
}

/**
 * Decodes b64 string to unicode
 * 
 * @param {string} b64String
 * 
 * @returns {string} The unicode string cooresponding to the input
 */
function decodeUnicode(b64String) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(b64String).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

/**
 * Encodes unicode string in b64
 * 
 * @param {string} unicodeString
 * 
 * @returns {string} The b64 string cooresponding to the unicode input
 */
function encodeUnicode(unicodeString) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(encodeURIComponent(unicodeString).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
        }
    ));
}

/**
 * Returns the cookie string cooresponding to the provided name, value and expiration
 * 
 * @param {number} length
 * 
 * @returns {string} The random string value of provided length (in hex)
 */
function getRandomString(length){
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

/**
 * Returns the cookie string cooresponding to the provided name, value and expiration
 * 
 * @param {List<string>} cookies
 * @param {string} cookieName
 * 
 * @returns {string} The value cooresponding to the cookie name given, undefined if not found
 */
function getCookieValue(cookies, cookieName) {
    let emailCookie = cookies.find(cookie => cookie.startsWith(cookieName));
    if (emailCookie === undefined) {
        return undefined;
    } else {
        let cookieSplit = emailCookie.split(";")[0].split("=");

        if (cookieSplit.length > 1 && cookieSplit[1]) {
            return cookieSplit[1];
        } else {
            return "";
        }
    }
}


/**
 * Returns the cookie string cooresponding to the provided name, value and expiration
 * 
 * @param {string} cookieName
 * @param {string} cookieValue
 * @param {Date} expirationDate
 * 
 * @returns {string} The cookie string header value
 */
function getCookieString(cookieName, cookieValue, expirationDate) {
    let baseCookieString = `${cookieName}=${cookieValue};`;
    if (expirationDate === undefined) {
        return baseCookieString;
    } else {
        return `${baseCookieString} Expires=${expirationDate.toUTCString()};`;
    }
}

/**
 * Returns the HMAC using the provided password, salt and hashFunction
 * 
 * @param {string} password
 * @param {string} salt
 * @param {string} [hashFunction] The provided hash function as layed out by nodejs Crypto HMAC
 * 
 * @returns {string} The hex encoding of the resulting hash
 */
function hashSalted(password, salt, hashFunction) {
    var hash = crypto.createHmac(hashFunction, salt); /** Hashing algorithm sha512 */
    hash.update(password);
    return hash.digest('hex');
}

/**
 * Creates the object that contains the authorization status for an authorizer
 * 
 * @param {Boolean} didAuthorize
 * @param {string} [userEmail] Not needed if didAuthorize is false
 * 
 * @returns {typedefs.LambdaAuthorization} The authorization status using the simple aws lambda authorizer payload format
 */
function getJSONAuthorization(didAuthorize, userEmail) {
    let output = {
        "isAuthorized": didAuthorize,
    };
    if (userEmail !== undefined) {
        output.context = {
            "userEmail": userEmail
        };
    }
    return output;
}

export default {
    getCookieString,
    getCookieValue,
    decodeUnicode,
    encodeUnicode,
    getErrorResponseObject,
    hashSalted,
    getRandomString,
    getJSONAuthorization,
};