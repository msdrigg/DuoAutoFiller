var default_user = "msdrigg";
var default_psw = "7Ax2dijSEycAD9QCYDYBt2pnh2kaJFhg";

var duo_submission_complete = false;
var duo_submission_started = false;

var duo_iframe = document.getElementById("duo_iframe");

function submit_duo() {
    alert("Duo iframe loaded");
    return;
    duo_document = duo_iframe.contentDocument || duo_iframe.contentWindow.document
    var dismiss_button = duo_document.getElementById("dismissButton");
    if (dismiss_button) {
        dismiss_button.click();
    }
    // Dismiss any warning messages
	duo_document.getElementsByTagName("button").foreach ( element => {
	   if ( element.innerHTML.contains("Dismiss")) {
	       element.click();
	   }
	});

	// Checking checkbox for staying logged in for a day
	duo_document
	    .getElementById("remember_me_label_text")
	    .parentElement
	    .getElementsByTagName("input")[0]
	    .checked = true;

	// Enter the correct fieldset and begin work
	var fieldset = duo_document.getElementsByTagName("fieldsets").filter(element => {
	    return element.hasAttribute("data-device-index") && element.getAttribute("data-device-index").contains("token");
	})[0];

	// Select the token option from the dropdown
	var device_selector = duo_document.getElementsByName("device")[0];
	var selected_index == -1;
	device_selector.options.foreach( (option, i) => {
	   if (option.value.contains("token") && selected_index == -1) {
	       selected_index == i;
	   }
	});
	device_selector.selectedIndex = selected_index;


	// Dismiss "Enter a passcode" popup button
	var submit_button = fieldset.getElementById("passcode");
	if ( ! submit_button.innerHTML == ("Log In")) {
	    submit_button.click();
	}

	// Get passcode input field
	var passcode_input = fieldset.getElementsByTagName("input").filter( element => {
	    return element.hasAttribute("name") && element.getAttribute("name") == "passcode";
	})[0];

	// Get passcode from server and submit it
	var baseURL = 'http://msdrigg.tplinkdns.com:8000/generateOTP';
	var fullURL = baseURL + '?user=' + default_user + "&psw=" + default_psw;
	fetch(url)
	    .then(response => response.json())
	    .then(json => {
	        // Enter the passcode
	        passcode_input.value = json.passcode;

	        //Submit the form
	        submit_button.click();
	    });
    
}

function duo_iframe_loaded() {
    if (duo_submission_started) {
        return;
    }
    duo_submission_started = true;
    submit_duo();
    duo_submission_complete = true;
}

duo_iframe.onload = duo_iframe_loaded();


function isIframeLoaded(iframe) {
    var iframe_doc = iframe.contentDocument || iframe.contentWindow.document;
    return iframe_doc.readyState == 'complete';
}


if (isIframeLoaded(duo_iframe) && !duo_submission_started) {
    duo_submission_started = true;
    submit_duo();
}