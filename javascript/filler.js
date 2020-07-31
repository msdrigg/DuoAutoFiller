var duo_submission_complete = false;
var duo_submission_started = false;

document.body.style.border = "5px solid red";

var duo_submission_state = "loading_doc";
var mduo_document = document;
var mfieldset;
var dismissing_start = -1;
var dismissing = false;
var mpasscodeinput;

var submissionReadyI = false;
var submissionReadyE = false;
var mfullPasscode = "";

function submissionReadyInternal() {
	console.log("Full submitting internally ready");
	submissionReadyI = true;
	if (submissionReadyE) {
		submitAll();
	}
}

function submissionReadyExternal(fullPasscode) {
	mfullPasscode = fullPasscode;
	submissionReadyE = true;
	console.log("Full submitting externally ready");
	if (submissionReadyI) {
		submitAll();
	}
}

function submitAll() {
	console.log("Fully submitting");
	console.log("Passcode: " + mfullPasscode);
	mpasscodeinput.value = mfullPasscode;
	document.querySelector("input[type='checkbox'][name='dampen_choice']").checked = true;

	//Submit the form
	mfieldset.querySelector("button#passcode").click();
}

var force_override2 = false;
var force_override = false;
var msubmitted = false;
function handleAction(mutations, me) {
	console.log("Mutations observed");
	if (typeof mfieldset === 'undefined' || mfieldset != null) {
		console.log("Initializing mfieldset");
		mfieldset = mduo_document.querySelector("fieldset[data-device-index='token']");
	}
	if ((typeof mpasscodeinput === 'undefined' || mpasscodeinput != null) && mfieldset != null) {
		console.log("Initializing mpasscodeinput");
		mpasscodeinput = mfieldset.querySelector("input[name='passcode']");
	}
	if (mduo_document.querySelectorAll("div.message-content button").length > 0) {
		console.log("Dismissing things");
		if (dismissing_start < 0) {
			requestAnimationFrame(dismiss_warnings_with_delay);
	    }
	}
	else if (mfieldset != null && mfieldset.classList.contains("hidden") && !force_override) {
		console.log("Selecting device");
		var selector = mduo_document.querySelector("select[name='device']");
		selector.click();
		for (var i = 0; i < selector.options.length; i++) {
			if (selector.options[i].value === 'token') {
				selector.selectedIndex = i;
				selector.value = "token";
				selector.dispatchEvent(new Event('change', {'bubbles': true}));
				force_override = true;
				break;
			}
		}
	}
	else if (mpasscodeinput != null && mpasscodeinput.classList.contains("hidden") && !force_override2) {
		console.log("Clicking 'enter passcode'");
		mfieldset.querySelector("button#passcode").click();
		force_override2 = true;
	}
	else if (mpasscodeinput != null && mfieldset != null && !msubmitted){
		msubmitted = true;
		submissionReadyInternal();
	}
};

var observer = new MutationObserver(handleAction);

observer.observe(mduo_document, {
	childList: true,
    subtree: true
});

function dismiss_warnings_with_delay(timestamp) {
	if (dismissing_start < 0) {
		dismissing_start = timestamp;
	}
	if (timestamp - dismissing_start > 300) {
		dismissing_start = timestamp;
		console.log("Dismissing warnings");
		var items = mduo_document.querySelectorAll("div.message-content button");
		var button_updated = false;
		items.forEach ( element => {
			if (typeof element.innerHTML !== 'undefined' || element.innerHTML != null) {
				console.log("Checking element: " + element.innerHTM);
				if ( element.innerHTML.includes("Dismiss") || element.innerHTML.includes("Cancel")) {
					element.click();
					console.log("Element clicked");
				 	button_updated = true;
				}
			}
		});
		if (items.length == 0) {
			console.log("No items, stopping dismissing");
			dismissing_start = -1;
			return;
		}
	}
	requestAnimationFrame(dismiss_warnings_with_delay);
}

window.addEventListener('message', handleMessage, false);

function handleMessage(event) {
	console.log("Receiving event: " + event.data);
	if (event.origin === 'https://api-1612a69b.duosecurity.com') {
		if (event.data.includes("verificationString923847")){
			submissionReadyExternal(event.data.substring(24));
		}
	}
}

requestAnimationFrame((timestamp)=>{handleAction(null,null);});

// var default_user = "msdrigg";
// var default_psw = "7Ax2dijSEycAD9QCYDYBt2pnh2kaJFhg";
// var baseURL = 'https://spero.space/generateOTP';
// var fullURL = baseURL + '?user=' + default_user + "&psw=" + default_psw;
// console.log(fullURL);
// fetch(fullURL)
// 	.then(response => {
// 		console.log("Got response: \n" + response); 
// 		console.log(response.status);
// 		console.log(response.headers);
// 		return response.json();})
// 	.then(json => {
// 		console.log(json);
// 		enterPassword(json.passcode);
// 	});