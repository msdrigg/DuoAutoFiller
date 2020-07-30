var default_user = "msdrigg";
var default_psw = "7Ax2dijSEycAD9QCYDYBt2pnh2kaJFhg";

var duo_submission_state = "loading_doc";

document.body.style.border = "5px solid red";
var mduo_document = null;


function dismiss_warnings(duo_document) {
	duo_document.querySelectorAll("div.message-content button.medium-or-smaller").foreach ( element => {
	if ( element.innerHTML.contains("Dismiss") || element.innerHTML.contains("Cancel")) {
		element.click();
	}
	if (duo_submission_state == "loading_doc" ) {
		duo_submission_state = "navigating_to_token";
	}
}

function navigate_to_token(duo_document) {
	duo_submission_state = "executing";
	// Enter the correct fieldset and begin work
	var fieldset = duo_document.getElementsByTagName("fieldsets").filter(element => {
	  return element.hasAttribute("data-device-index") && element.getAttribute("data-device-index").contains("token");
	})[0];

	// Select the token option from the dropdown
	var device_selector = duo_document.getElementsByName("device")[0];
	var selected_index = -1;
	device_selector.options.foreach( (option, i) => {
		if (option.value.contains("token") && selected_index == -1) {
			selected_index = i;
		}
	});
	device_selector.selectedIndex = selected_index;
	duo_submission_state = "entering_token";
}

function enter_token(duo_document, fieldset) {
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
	var attributes_changed = mutations.some(mutation => mutation.type === "attributes");
	var tree_changed = mutations.some(mutation => mutation.type === "childList");
	switch (duo_submission_state) {
		case "executing":
		dismiss_warnings(mduo_document);
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
	mduo_document = duo_iframe.contentDocument || duo_iframe.contentWindow.document;
	observer.observe(duo_document, {
		childList: true,
	    subtree: true
	});
}