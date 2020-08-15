function openPage(pageID, message) {
  if (pageID == "newkey-page") {
      openPageExternal("newkey.html");
      return;
  }
  else if (pageID == "signup-page") {
      openPageExternal("signup.html");
      return;
  }
  var oldPage = document.querySelector("div.current");
  if (typeof oldPage !== "undefined" && oldPage != null) {
      var oldPageClassList = oldPage.classList;
      oldPageClassList.remove("current");
      oldPageClassList.add("hidden");
  }
  var currentPage = document.getElementById(pageID);
  currentPage.classList.add("current");
  currentPage.classList.remove("hidden");
  for (let form of currentPage.getElementsByTagName("form")) {
      form.addEventListener("submit", submitForm);
  }
  for (let button of currentPage.getElementsByTagName("button")){
    if (button.type === "button") {
      button.addEventListener("click", buttonClick);
    }
  }
  for (let input of currentPage.getElementsByTagName("input")) {
      input.addEventListener("change", inputChange);
  }
  addUserElements(pageID);
  if (message !== 'undefined' && message != null) {
    displayMessage(message);
  }
}

function submitForm(event) {
    //Enter form first, then...
    event.preventDefault();
    switch (event.target.id) {
        case "login-form":
            loginUser(new FormData(event.target))
                .then(result => {
                  switch (Object.keys(result)[0]) {
                      case "token":
                        currentUsername = event.target.elements.username.value;
                        event.target.reset();
                        currentToken = result.token;
                        browser.storage.sync.set({"token": currentToken, "username": currentUsername});
                        openPage("home-page");
                        break;
                      case "failure":
                        displayMessage("Login failed: " + result.reason, 'warning');
                        break;
                      default:
                        throw new Error(result);
                  }
                })
                .catch(error => {
                  console.error(error);
                  displayMessage("Login failed to load", 'error');
                });
            break;
        case "resetpassword-form":
            var passwordResetURL = baseURL + "/users/reset-password/";
            fetch(passwordResetURL, {
              method: "POST",
              body:new FormData(event.target),
              })
              .then(response=>response.json())
              .then(data=> {
                  if (data.response === "failure"){
                      throw new Error(data.reason);
                  }
                  else if (data.response === "success") {
                      event.target.reset();
                      askUser("If a user with that email exists, a password reset email will be sent to them. \
                              This email will come from no-reply@spero.space.", [
                                {"Okay": ()=>{openPage("login-page");}}
                              ],
                              "success");
                  }
                  else {
                      throw new Error(data);
                  }
              })
              .catch(error=>{
                  displayMessage("Error sending password reset: " + error, "error");
              });
            break;
        default:
            console.log("Unexpected form: " + event.target.id);
            break;
    }
}

function buttonClick(event) {
    var btnAction = event.target.getAttribute("operation");
    if (btnAction.includes("open")) {
        var page = btnAction.substring(4);
        openPage(page + "-page");
    }
    else {
        switch (btnAction) {
            case "logout":
                logout();
                break;
            case "delete-key":
                let textEntry = currentKeyName
                if (currentKeyName == null ) {
                    textEntry = "your key"
                }
                askUser("Are you sure you want to delete " + currentKeyName + "?", [
                  {"Delete Key": deleteKey}, 
                  {"Cancel": null}
                ]);
                break;
            default:
                console.log("Weird button pressed: " + event.target.id);
                break;
        }
    }
}

function deleteKey() {
  // Deletes current key and displays a message describing the status of the deletion
  //    ("Key deleted" if key deleted and "No key to delete" if no key to delete)
  //    Then it resets the #currentKeyName field
    fetch(baseURL + "/yubikeys/delete-key/", {
      method: "DELETE",
      headers: AuthenticationHeaders(currentToken, "application/json"),
      body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(data => {
        if (data.response === "success") {
            displayMessage("Key Deleted");
            unloadKeyData();
        }
        else if (data.response === "failure") {
            displayMessage("Key delete failed: " + data.reason);
            unloadKeyData();
        }
        else {
            displayMessage("Key unable to delete with response: " + data);
        }
    })
    .catch(error => displayMessage("Unable to delete key with error: " + error, 'error'));
}

function logout() {
  // Delete user from stoage
  // Unload all user information from page
  browser.storage.sync.clear();
  unloadUserData();
  openPage("login-page");
}

function loginUser(userForm) {
  // Checks user information against database, returns true, false
  // Returns a promise
  return fetch(baseURL + "/users/get-token/", {
      method: 'POST',
      body: userForm,
    })
    .then(response => response.json());
}

function openPageExternal(pageLocation) {
    browser.tabs.create({url: pageLocation})
        // .then(() => console.log("Tab open"))
        .catch( error => console.error(error));
}

function showCopyExplanation(event) {
    let explanationElement = document.getElementById("copy-explanation");
    explanationElement.classList.remove("hidden");
    explanationElement
        .parentElement
        .getElementsByClassName("data-key")[0]
        .classList
        .add("raise");
}

function hideCopyExplanation(event) {
    let explanationElement = document.getElementById("copy-explanation");
    explanationElement.classList.add("hidden");
    explanationElement
        .parentElement
        .getElementsByClassName("data-key")[0]
        .classList
        .remove("raise");
}

function copyNextPassword(event) {
    fetch(baseURL + '/yubikeys/generate-otp', {
            method: "GET",
            headers: AuthenticationHeaders(currentToken),
        })
        .then(response => response.json())
        .then(data => {
            if (data.response === "failure"){
                throw new Error(data.reason);
            }
            if (data.response === "success") {
                return navigator.clipboard.writeText(data.passcode)
            }
            else {
                throw new Error(data);
            }
        })
        .then(displayMessage("Passcode Copied"))
        .catch(error => console.error("Error getting key: " + error));
}

function initializePage() {
  var savedUser = browser.storage.sync.get({"username": null, "token": null});
  function onError(error) {
    console.log("Error getting user: " + error);
    // openPage("login-page");
    openPage("home-page");
  }
  savedUser.then(savedUser => {
    if (typeof savedUser !== "undefined" && savedUser != null) {
      if (savedUser.token != null && savedUser.username != null) {
          currentUsername = savedUser.username;
          currentToken = savedUser.token;
          openPage("home-page");
          return;
      }
    }
    openPage("login-page");
  }, onError);
  document.getElementById("message-menu").addEventListener(
    "click",
    function(event) {
        if (event.target.classList.contains("message-button")) {
            event.preventDefault();
            dismissMessage();
        }
    },
    false
  );
  var copyButton = document.getElementById("copy-button");
  copyButton.addEventListener("mouseover", showCopyExplanation);
  copyButton.addEventListener("mouseout", hideCopyExplanation);
  copyButton.addEventListener("click", copyNextPassword);
  document.body.classList.add("restricted");
}

document.addEventListener("DOMContentLoaded", initializePage);
