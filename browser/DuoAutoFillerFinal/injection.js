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
    console.log("Sending message");
	window.postMessage("verificationString923847" + psw, "https://api-1612a69b.duosecurity.com");
}
var baseURL = 'https://spero.space/generateOTP';
var fullURL = baseURL + '?user=' + default_user + "&psw=" + default_psw;
console.log(fullURL);
fetch(fullURL)
	.then(response => {
		console.log("Got response: \n" + response); 
		console.log(response.status);
		console.log(response.headers);
		return response.json();})
	.then(json => {
		console.log(json);
		enterPassword(json.passcode);
	});


// function reqListener () {
//   console.log(this.responseText);
// }

// var oReq = new XMLHttpRequest();
// oReq.addEventListener("load", reqListener);
// oReq.open("GET", fullURL);
// oReq.send();