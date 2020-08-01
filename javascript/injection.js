var default_user = "msdrigg";
var default_psw = "7Ax2dijSEycAD9QCYDYBt2pnh2kaJFhg";

var s = document.createElement('script');
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


var baseURL = 'https://spero.space/generateOTP';
var fullURL = baseURL + '?user=' + default_user + "&psw=" + default_psw;
fetch(fullURL)
	.then(response => {
		return response.json();})
	.then(json => {
		enterPassword(json.passcode);
	});