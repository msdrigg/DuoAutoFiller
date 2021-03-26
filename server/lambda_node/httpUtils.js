function getErrorResponseObject(message, code) {
    return {
        body: {"ErrorMessage": message},
        statusCode: code
    };
}

function decodeUnicode(str) {
    // Going backwards: from bytestream, to percent-encoding, to original string.
    return decodeURIComponent(atob(str).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

function encodeUnicode(str) {
    // first we use encodeURIComponent to get percent-encoded UTF-8,
    // then we convert the percent encodings into raw bytes which
    // can be fed into btoa.
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
        function toSolidBytes(match, p1) {
            return String.fromCharCode('0x' + p1);
        }
    ));
}

function getCookieValue(cookies, cookieName) {
    let emailCookie = cookies.find(cookie => cookie.startsWith(cookieName));
    if (emailCookie === undefined) {
        return "";
    } else {
        let cookieSplit = emailCookie.split(";")[0].split("=");

        if (cookieSplit.length > 1 && cookieSplit[1]) {
            return decodeUnicode(cookieSplit[1]);
        } else {
            return "";
        }
    }
}

function getCookieString(cookieName, cookieValue, expirationDate) {
    let baseCookieString = `${cookieName}=${cookieValue};`
    if (expirationDate === undefined) {
        return baseCookieString;
    } else {
        return `${baseCookieString} Expires=${expirationDate.toUTCString()};`;
    }
}

OK_MODEL = {"Result": "Success"};

module.exports = {
    getCookieString,
    getCookieValue,
    decodeUnicode,
    encodeUnicode,
    getErrorResponseObject,
    OK_MODEL
};