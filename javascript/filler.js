var duo_submission_complete = false;
var duo_submission_started = false;

document.body.style.border = "5px solid red";

var duo_submission_state = "loading_doc";
var mduo_document = document;
var mfieldset;
var dismissing_start = -1;
var dismissing = false;
var mpasscodeinput;

function dismiss_warnings(duo_document) {
	console.log("Dismissing warnings");
	var items = duo_document.querySelectorAll("div.message-content button");
	console.log(items);
	var button_updated = false;
	items.forEach ( element => {
		console.log("Checking element: " + element.innerHTM);
		if ( element.innerHTML.includes("Dismiss") || element.innerHTML.includes("Cancel")) {
			element.click();
			console.log("Element clicked");
		 	button_updated = true;
		}
	});
	if (button_updated && duo_submission_state == "loading_doc" ) {
		duo_submission_state = "navigating_to_token";
	}
}

function navigate_to_token(duo_document) {
	console.log("navigating to token");
	duo_submission_state = "executing";
	// Enter the correct fieldset and begin work
	var fieldset = duo_document.getElementsByTagName("fieldsets").filter(element => {
	  return element.hasAttribute("data-device-index") && element.getAttribute("data-device-index").includes("token");
	})[0];

	// Select the token option from the dropdown
	var device_selector = duo_document.getElementsByName("device")[0];
	var selected_index = -1;
	device_selector.options.forEach( (option, i) => {
		if (option.value.includes("token") && selected_index == -1) {
			selected_index = i;
		}
	});
	device_selector.selectedIndex = selected_index;
	duo_submission_state = "entering_token";
}

function enter_token(duo_document, fieldset) {
	console.log("Entering token");
	duo_submission_state = "executing";
	duo_document
		.getElementById("remember_me_label_text")
		.parentElement
		.getElementsByTagName("input")[0]
		.checked = true;
	// Dismiss "Enter a passcode" popup button
	var submit_button = fieldset.getElementById("passcode");
	if (submit_button.innerHTML != ("Log In")) {
		submit_button.click();
	}

	// Get passcode input field
	var passcode_input = fieldset.getElementsByTagName("input").filter( element => {
		return element.hasAttribute("name") && element.getAttribute("name") == "passcode";
	})[0];

	// Get passcode from server and submit it
	var baseURL = 'http://msdrigg.tplinkdns.com:8000/generateOTP';
	var fullURL = baseURL + '?user=' + default_user + "&psw=" + default_psw;
	fetch(fullURL)
	  .then(response => response.json())
	  .then(json => {
	      // Enter the passcode
	      passcode_input.value = json.passcode;

	      //Submit the form
	      submit_button.click();
	      duo_submission_state = "done";
	  });
}

var submissionReadyI = false;
var submissionReadyE = false;
var fullPasscode = "";

function submissionReadyInternal() {
	console.log("Full submitting internally ready");
	submissionReadyI = true;
	if (submissionReadyE) {
		submitAll();
	}
}

function submissionReadyExternal(fullPasscode) {
	fullPasscode = fullPasscode;
	submissionReadyE = true;
	console.log("Full submitting externally ready");
	if (submissionReadyI) {
		submitAll();
	}
}

function submitAll() {
	console.log("Fully submitting");
	mpasscodeinput.value = fullPasscode;
	//Submit the form
	mfieldset.querySelector("button#passcode").click();
}

console.log("Working on things");

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
requestAnimationFrame((timestamp)=>{handleAction(null,null);});

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