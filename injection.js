var default_user = "msdrigg";
var default_psw = "7Ax2dijSEycAD9QCYDYBt2pnh2kaJFhg";

var s = document.createElement('script');
s.src = browser.extension.getURL('/javascript/filler.js');
s.onload = function () {
	this.remove();
};
(document.head || document.documentElement).appendChild(s);

// Get passcode from server and submit it
var baseURL = 'https://msdrigg.tplinkdns.com/generateOTP';
var fullURL = baseURL + '?user=' + default_user + "&psw=" + default_psw;
console.log(fullURL);
fetch(fullURL)
	.then(response => {return response.json();})
	.then(json => {
		// Enter the passcode
		console.log("Gotten passcode");
		console.log(json);
		actualCode = '(' + function(passcode) { 
			submissionReadyExternal(passcode);
		} + ')(' + JSON.stringify(json.passcode) + ');';
		var s2 = document.createElement('script');
		s2.textContent = actualCode;
		(document.head||document.documentElement).appendChild(s2);
		s2.remove();
	});
