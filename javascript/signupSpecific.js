// Functions for signup external page
function localizedButtonClick(event) {
    return Promise.resolve(event);
}

function localizedFormSubmit(event) {
    let targetForm = event.target;
    if (targetForm.id === "signup-form") {
        event.preventDefault();
        
        // Checking for matching passwords
        let passwordInputs = targetForm.querySelectorAll("input[type='password']");
        password1 = passwordInputs.item(0);
        if (password1 == null) {
            throw new Error("No password fields found");
        }
        let passwordsMatch = true;
        passwordInputs.forEach(passwordElement => {
            if (password1.value !== passwordElement.value) {
                passwordsMatch = false;
            }
        });
        if (!passwordsMatch) {
            passwordInputs.forEach(element => {
                element.setCustomValidity("Password inputs do not match");
            });
            return;
        }
        var sentPromise = fetch(baseURL + "/users/create-user/", {
            method: "POST",
            body:new FormData(targetForm),
        })
        .then(response=>response.json())
        .then(data => {
            return new Promise((resolve, reject) =>  {
                switch(data.response) {
                    case "success":
                        console.log("User created");
                        event.action = "closepage";
                        break;
                    case "failure":
                        var description = "Error Creating user: " + data.reason;
                        console.log(description);
                        displayMessage(description, "warning");
                        break;
                    default:
                    throw new Error("Strange response from server: " + data);
                }
                resolve(event);
            });
        });
        sentPromise.catch(error=>{
          console.error(error);
          displayMessage(error, "error");
        });
        return sentPromise;
    }
    else {
        return Promise.resolve(event);
    }
}

function localizedInputHandler(event) {
    if (event.target.patternMismatch){
        event.target.setCustomValidity("This field must contain a number and a letter");
    }
    else {
        let passwordInputs = event.target.form.querySelectorAll("input[type='password']");
        password1 = passwordInputs.item(0);
        if (password1 == null) {
            throw new Error("No password fields found");
        }
        let passwordsMatch = true;
        let passwordsReady = true;
        passwordInputs.forEach(passwordElement => {
            if (password1.value !== passwordElement.value) {
                passwordsMatch = false;
            }
            if (!passwordElement.classList.contains("changed")) {
                passwordsReady = false;
            }
        });
        passwordInputs.forEach(element => {
            if (passwordsMatch || !passwordsReady) {
                element.setCustomValidity("");
            }
        });
    }
}

function localizedChangeHandler(event) {
    if (event.target.patternMismatch){
        event.target.setCustomValidity("This field must contain a number and a letter");
    }
    else {
        let passwordInputs = event.target.form.querySelectorAll("input[type='password']");
        password1 = passwordInputs.item(0);
        if (password1 == null) {
            throw new Error("No password fields found");
        }
        let passwordsMatch = true;
        let passwordsReady = true;
        passwordInputs.forEach(passwordElement => {
            if (password1.value !== passwordElement.value) {
                passwordsMatch = false;
            }
            if (!passwordElement.classList.contains("changed")) {
                passwordsReady = false;
            }
        });
        passwordInputs.forEach(element => {
            if (!passwordsMatch && passwordsReady) {
                element.setCustomValidity("Password inputs do not match");
            }
            else {
                element.setCustomValidity("");
            }
        });
    }
}

function localizedPageDoneLoading() {
    return;
}

document.addEventListener("DOMContentLoaded", initializePage);