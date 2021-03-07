// Functions for newkey external page
function localizedButtonClick(event) {
    return Promise.resolve(event);
}
     
function localizedFormSubmit(event) {
    let submittedForm = new FormData();
    for (input of event.target.getElementsByTagName("input")) {
        submittedForm.append(input.name, input.value.replace(/\s/g, ''));
    }
    if (event.target.id === "newkey-form") {
        event.preventDefault();
        var newKeyURL = baseURL + "/yubikeys/create-key/";
        var sentPromise = fetch(newKeyURL, {
            method: "POST",
            headers: AuthenticationHeaders(currentToken),
            body: submittedForm
        })
        .then(response=>response.json())
        .then(data=> {
            return new Promise((resolve, reject) =>  {
                switch(data.response) {
                    case "success":
                        event.action = "closepage";
                        break;
                    case "failure":
                        displayMessage("Error Creating key: " + data.reason);
                        break;
                    default:
                    throw new Error("Strange response from server: " + data);
                }
                resolve(event);
            });
        });
        sentPromise.catch(error=>{
          displayMessage(error, "error");
        });
        return sentPromise;
    }
    else {
        return Promise.resolve(event);
    }
}

function localizedInputHandler(event) {
    if (event.target.hasAttribute("hex")) {
        var oldValue = (event.target.dataset.oldValue ? event.target.dataset.oldValue : "");
        if (!hexRegex.test(event.target.input)) {
            event.target.classList.add("hex-fail");
        }
        else {
            event.target.classList.remove("hex-fail");
        }
        var inputValueNoSpace = event.target.value.replace(/\s/g, '');
        var chunks = [];
        let i, len;
        for (i = 0, len = inputValueNoSpace.length; i < len; i += 2) {
            chunks.push(inputValueNoSpace.substring(i, i + 2));
        }
        let maxLength = 200000;
        if (event.target.maxLength) {
            maxLength = event.target.maxLength;
        }
        if (chunks.length > 0 && chunks[chunks.length - 1].length == 2 && 
            chunks.length * 3 <= maxLength &&
            oldValue.length < event.target.value.length) {
            chunks.push("");
        }
        var outputValueSpaced = chunks.join(" ");
        event.target.value = outputValueSpaced;
        event.target.dataset.oldValue = event.target.value;
        if (event.target.validity.patternMismatch){
            if (!hexRegex.test(inputValueNoSpace)) {
                event.target.setCustomValidity("This field can only contain characters 0-9 and a-f.");
            }
            else {
                let minCoreLength = event.target.getAttribute("mincorelength");
                if (inputValueNoSpace.length < minCoreLength){
                    event.target.setCustomValidity("This field must be at least " + minCoreLength + " characters (You are currently using " + inputValueNoSpace.length + " characters.");
                }
            }
        }
        else {
            event.target.setCustomValidity("");
        }
    }
}

function localizedPageDoneLoading(){
    if (!currentUsername || !currentToken) {
        disableMainPage();
        askUser("No logged in user. Please log in and try again", {
                "Close Page": closePage,
            }, 
            "error"
        );
    }
    addUserElements();
}


document.addEventListener("DOMContentLoaded", initializePage);