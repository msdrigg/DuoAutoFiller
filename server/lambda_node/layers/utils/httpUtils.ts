import crypto = require("crypto");
import { LambdaAuthorization } from "../authorization/types";

/**
 * Decodes b64 string to unicode
 * 
 * @param {string} b64String
 * 
 * @returns {string} The unicode string cooresponding to the input
 */
function decodeUnicode(encoded: string): string {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    let binary = atob(encoded)
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < bytes.length; i++) {
    bytes[i] = binary.charCodeAt(i);
    }
    return String.fromCharCode(...new Uint16Array(bytes.buffer));
}

/**
 * Encodes unicode string in b64
 * 
 * @param {string} unicodeString
 * 
 * @returns {string} The b64 string cooresponding to the unicode input
 */
function encodeUnicode(unicodeString: string): string {
  const codeUnits = new Uint16Array(unicodeString.length);
  for (let i = 0; i < codeUnits.length; i++) {
    codeUnits[i] = unicodeString.charCodeAt(i);
  }
  return btoa(String.fromCharCode(...new Uint8Array(codeUnits.buffer)));
}

/**
 * Returns the cookie string cooresponding to the provided name, value and expiration
 * 
 * @param {number} length
 * 
 * @returns {string} The random string value of provided length (in hex)
 */
function getRandomString(length: number): string{
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

/**
 * Returns the cookie string cooresponding to the provided name, value and expiration
 * 
 * @param {Array<string>} cookies
 * @param {string} cookieName
 * 
 * @returns {string} The value cooresponding to the cookie name given, undefined if not found
 */
function getCookieValue(cookies: Array<string>, cookieName: string): string {
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
function getCookieString(cookieName: string, cookieValue: string, expirationDate: Date): string {
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
function hashSalted(password: string, salt: string, hashFunction: string): string {
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
function getJSONAuthorization(didAuthorize: boolean, userEmail: string): LambdaAuthorization {
    let output: LambdaAuthorization = {
        isAuthorized: didAuthorize,
        context: {
            userEmail: null
        }
    };
    if (userEmail !== undefined) {
        output.context.userEmail = userEmail
    }
    return output;
}


export default {
    getCookieString,
    getCookieValue,
    decodeUnicode,
    encodeUnicode,
    hashSalted,
    getRandomString,
    getJSONAuthorization,
};

