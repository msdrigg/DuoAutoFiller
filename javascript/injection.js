var baseURL = 'https://spero.space/yubikeys/generate-otp';
var s = document.createElement('script');
function AuthenticationHeaders(token) {
    if (token) {
        return {
            'Authorization': 'Token ' + token,
        };
    }
    else {
        throw new Error("No token provided");
    }
}
var currentToken = "";
s.src = browser.extension.getURL('/javascript/filler.js');
s.onload = function () {
	this.remove();
};
(document.head || document.documentElement).appendChild(s);

// Get passcode from server and submit it
function enterPassword(psw) {
	var re = new RegExp("https://api-[0-9a-f]*\\.duosecurity\\.com");
	if (re.test(window.origin)) {
		window.postMessage("verificationString923847" + psw, "*");
	}
	else {
		console.log("ERROR: Window origin could not be verified: " + window.origin);
	}
}
browser.storage.sync.get({"token": null})
    .then(token => {
        if (typeof token !== "undefined" && token != null) {
            fetch(baseURL, {
                    method: "GET",
                    headers: AuthenticationHeaders(token.token),
                })
                .then(response => response.json())
                .then(data => {
                    if (data.response === "failure"){
                        throw new Error(data.reason);
                    }
                    if (data.response === "success") {
                        enterPassword(data.passcode);
                    }
                    else {
                        throw new Error(data);
                    }
                })
                .catch(error => console.error("Error getting key: " + error));
        }
    })
    .catch(error => console.error(error));