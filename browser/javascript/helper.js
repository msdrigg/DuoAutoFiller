// Contains general helper functions
var currentUsername = "msdrigg";
var currentToken = 2092348;
var currentKeyName = "ClemsonDuo";
var hexRegex = new RegExp("^[a-fA-f0-9\s]*$")
var baseURL = "https://spero.space";
function AuthenticationHeaders(token, contentType) {
    if (token) {
        if (typeof contentType !== "undefined" && contentType != null) {
            return {
                'Content-Type': contentType,
                'Authorization': 'Token ' + token,
            };
        }
        else {
            return {
                'Authorization': 'Token ' + token,
            };
        }
    }
    else {
        throw new Error("No token provided");
    }
}

function inputChange(event) {
    event.target.classList.add("changed");
    if (typeof localizedChangeHandler !== "undefined") {
        localizedChangeHandler(event);
    }
}

function clearChildren(node) {
    while (node.firstChild) {
        node.lastChild.remove();
    }
}

function unloadKeyData(page) {
  currentKeyName = null;
  var searchedArea = document;
  if (typeof page !== "undefined" && page != null) {
    searchedArea = page;
  }
  for (let element of searchedArea.getElementsByClassName("data-key")) {
      clearChildren(element);
      element.appendChild(document.createTextNode("No stored keys"));
      element.parentElement.classList.remove("hidden");
  }
  let deleteButton = document.querySelector("button[operation='delete-key']");
  if (typeof deleteButton !== "undefined" && deleteButton != null) {
      deleteButton.classList.add("hidden");
  }
}

function unloadUserData(page) {
  var searchedArea = document;
  if (typeof page !== "undefined" && page != null) {
    searchedArea = page;
  }
  currentUsername = null;
  currentToken = null;
  for (let form of searchedArea.getElementsByTagName("form")) {
      form.reset();
  }
  for (let element of searchedArea.getElementsByClassName("data-username")) {
      clearChildren(element);
      element.parentElement.classList.add("hidden");
  }
  unloadKeyData(searchedArea);
}

function displayMessage(message, type) {
  // Display the message as a small slider with menu saying "dismiss"
  askUser(message, null, type);
}

function addUserElements(pageID) {
  // User elements to page (current key name and username)
  // Displays "No key" if no key currently available
  var page = document;
  if (typeof pageID !== "undefined" && pageID != null) {
    page = document.getElementById(pageID);
  }
  if (currentUsername == null || currentToken == null) {
      return;
  }
  let matches = document.getElementsByClassName("data-username");
  let usernameElement = null;
  if (matches == null || matches.length === 0) {
      return;
  }
  else {
      usernameElement = matches[0];
  }
  if (currentUsername == null || currentToken == null) {
      var savedUser = browser.storage.sync.get({"username": null, "token": null});
      // user = {"username": currentUsername, "token": currentToken};
      Promise.resolve(savedUser)
        .then(savedUser => {
            if (typeof savedUser !== "undefined" && savedUser != null) {
              console.log("Saved user loaded: " + user);
              currentUsername = user.username;
              currentToken = user.token;
              clearChildren(usernameElement);
              usernameElement.appendChild(document.createTextNode(currentUsername));
              usernameElement.parentElement.classList.remove("hidden");
              loadCurrentKey(page);
            }
            else {
              throw new Error("Error getting user from database");
            }
          })
        .catch (error => {
          console.log("Error getting user: " + error);
          logout();
          displayMessage("Error getting Username: " + error, "error");
      	});
  }
  else {
      clearChildren(usernameElement);
      usernameElement.appendChild(document.createTextNode(currentUsername));
      usernameElement.parentElement.classList.remove("hidden");
      loadCurrentKey(page);
  }
}
	
function loadCurrentKey(page) {
    fetch(baseURL + "/yubikeys/get-key-name/", {
      method: "GET",
      headers: AuthenticationHeaders(currentToken, null),
      credentials: 'include',
    })
    
    // Promise.resolve({"key_name": currentKeyName, response: "success"})
    .then(response => response.json())
    .then(data => {
        if (data.response === "success") {
            var keyName = data.key_name;
            var yubikey = page.getElementsByClassName("data-key")[0];
            clearChildren(yubikey);
            yubikey.appendChild(document.createTextNode(keyName));
            for (element of page.getElementsByClassName("focus-wrapper")) {
                if (element.contains(yubikey)) {
                    element.classList.remove("hidden");
                }
            }
            currentKeyName = keyName;
            let deleteButton = document.querySelector("button[operation='delete-key']");
            if (typeof deleteButton !== "undefined" && deleteButton != null) {
                deleteButton.classList.remove("hidden");
            }
        }
        else if (data.response === "failure") {
            // displayMessage("Getting key failed: " + data.reason);
            unloadKeyData();
        }
        else {
            displayMessage("Key unable to load key with result: " + JSON.stringify(data), 'warning');
        }
    })
    .catch(error => console.error("Unable to load key with error: " + error, 'error'));
}

function askUser(question, providedButtons, providedType) {
  dismissMessage();
  var type = "default";
  if (typeof providedType !== "undefined" && providedType != null) {
      type = providedType;
  }
  var buttons = [{"Dismiss": null}];
  if (typeof providedButtons !== "undefined" && providedButtons != null) {
      buttons = providedButtons;
  }
  for (let button in buttons) {
      let btnMessage = Object.keys(buttons[button])[0];
      if (typeof button[btnMessage] === 'undefined' || button[btnMessage] == null) {
          button[btnMessage] = dismissMessage;
      }
  }
  var messageMenu = document.getElementById("message-menu");
  messageMenu.classList.remove("hidden");
  messageMenu.classList.add("type-" + type);
  document.getElementById("message-content")
    .appendChild(
      document.createTextNode(question)
    );
  var responseContent = document.getElementById("message-response");
  for (let index in buttons) {
  	if (buttons.hasOwnProperty(index)) {
       let buttonMsg = Object.keys(buttons[index])[0];
       var buttonElement = document.createElement("button");
       buttonElement.appendChild(document.createTextNode(buttonMsg));
       buttonElement.type = "button";
       buttonElement.classList.add("message-button");
       buttonElement.addEventListener("click", buttons[index][buttonMsg]);
       responseContent.appendChild(buttonElement); 
    }
  }
}

function dismissMessage() {
  var messageMenu = document.getElementById("message-menu");
  // Clear classList to remove all "type" elements. If we need other classes here, add an additional div
  messageMenu.className = "hidden";
  clearChildren(document.getElementById("message-content"));
  clearChildren(document.getElementById("message-response"));
}
