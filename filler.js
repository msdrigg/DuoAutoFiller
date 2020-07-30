var default_user = "msdrigg";
var default_psw = "7Ax2dijSEycAD9QCYDYBt2pnh2kaJFhg";

var duo_submission_complete = false;
var duo_submission_started = false;

document.body.style.border = "5px solid red";

var duo_submission_state = "loading_doc";
var mduo_document = document;

function dismiss_warnings(duo_document) {
	console.log("Dismissing warnings");
	items = duo_document.querySelectorAll("div.message-content button");
	console.log(items);
	items.forEach ( element => {
		console.log("Element found but not clicked");
		console.log(element.innerHTML);
		console.log(String(element.innerHTML).contains("Cancel"));
		if ( element.innerHTML.contains("Dismiss") || element.innerHTML.contains("Cancel")) {
			element.click();
			console.log("Element clicked");
		}
		else {
			element.innerHTML = "Yeet";
		}
	});
	if (duo_submission_state == "loading_doc" ) {
		duo_submission_state = "navigating_to_token";
	}
}

function navigate_to_token(duo_document) {
	console.log("navigating to token");
	duo_submission_state = "executing";
	// Enter the correct fieldset and begin work
	var fieldset = duo_document.getElementsByTagName("fieldsets").filter(element => {
	  return element.hasAttribute("data-device-index") && element.getAttribute("data-device-index").contains("token");
	})[0];

	// Select the token option from the dropdown
	var device_selector = duo_document.getElementsByName("device")[0];
	var selected_index = -1;
	device_selector.options.forEach( (option, i) => {
		if (option.value.contains("token") && selected_index == -1) {
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


var observer = new MutationObserver( function (mutations, me) {
	console.log("Mutations observed");
	console.log(duo_submission_state);
	var attributes_changed = mutations.some(mutation => mutation.type === "attributes");
	var tree_changed = mutations.some(mutation => mutation.type === "childList");
	switch (duo_submission_state) {
		case "executing":
		dismiss_warnings(mduo_document);
		break;
		case "loading_doc":
		if (tree_changed) {
			dismiss_warnings(mduo_document);
		}
		break;
		case "navigating_to_token":
		dismiss_warnings(mduo_document);
		break;
		case "entering_token":
		dismiss_warnings(mduo_document);
		enter_token(mduo_document);
		break;
	}
});

function duo_iframe_loaded () {
	console.log("Iframe loaded");
	console.log(duo_iframe)
	mduo_document = duo_iframe.contentWindow.document;
	console.log(mduo_document);
	observer.observe(mduo_document, {
		childList: true,
	    subtree: true
	});
	console.log("Stareted observing");
}
observer.observe(mduo_document, {
	childList: true,
    subtree: true
});