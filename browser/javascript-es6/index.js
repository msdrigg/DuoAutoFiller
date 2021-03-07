// IF CHROME, TOGGLE THESE TWO LINE COMMENTS
let browserProxy = browser;
// let browserProxy = chrome;

let pages = "";
let currentUsername = "";
let currentToken = "";
const baseURL = "https://spero.space";

const LOGIN_ACTION = "/users/login/";
const HTML_ROOT = "/html/";

async function submitForm(event){
    let form = event.target;
    if (typeof form.action === "undefined" || form.action == null){
        return event;
    }
    // event.preventDefault();
    let submittedForm = new FormData();
    for (input of form.getElementsByTagName("input")) {
        if (typeof input.name !== "undefined" && input.name != null){
            submittedForm.append(input.name, input.value.replace(/\s/g, ''));
        }
    }
    var newKeyURL = baseURL + form.action;
    return sentPromise = fetch(newKeyURL, {
        method: "POST",
        headers: AuthenticationHeaders(),
        body: submittedForm
    })
    .then(response=>response.json())
    .then(data=>{
        if (data.response === "success") {
            return formSubmitted(form);
        }
        else if (data.response === "failure"){
            return handleError(data.reason);
        }
        else {
            return handleError(data);
        }
    });
}

async function formSubmitted(form){
    switch (form.dataset.operation) {
        case "display-message":
            return displayMessage("Form Uploaded!");
        case "login":
            let newForm = form.cloneNode(true);
            newForm.action = LOGIN_ACTION;
            return submitForm(form);
        case "close":
            return closePage(form.ownerDocument.URL);
        default:
            return;
    }
}


async function inputUpdated(event){
    let eventListener = event.target.dataset.listener;
    switch (eventListener) {
        case "hex":
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
            break;
        case "password":
            let lengthIndicator = document.getElementById("password-length-explanation");
            let letterIndicator = document.getElementById("password-letter-explanation");
            if (event.target.value.length > 8) {
                lengthIndicator.style.color = "green";
            }
            else if (event.target.classList.contains("changed") || 
                (lengthIndicator.style.color && lengthIndicator.style.color== "green")) {
                lengthIndicator.style.color = "red";
            }
            if (new RegExp("^.*[A-Za-z]").test(event.target.value)){
                document.getElementById("password-letter-explanation")
                    .style.color = "green";
            }
            else if (event.target.classList.contains("changed") || 
                (letterIndicator.style.color && letterIndicator.style.color== "green")) {
                letterIndicator.style.color = "red";
            }
            break;
        default:
            console.log("Weird event listener: " + event);
            break;
    }
}

async function inputChanged(event){
    event.target.classList.add("changed");
    let operation = event.target.dataset.operation;
    if (operation) {
        switch(operation){
            case "showpassword":
                let inputId = event.target.id.replace("show-", "");
                let inputField = document.getElementById(inputId);
                if (event.target.checked){
                    inputField.type = "text";
                }
                else {
                    inputField.type = "password";
                }
                break;
            default:
                return event;
        }
    }
}

async function logout(){
    // TODO: THIS
}

async function askUser(){
    
}

function AuthenticationHeaders(token, mimeType){
  return "";
}

async function deleteKey(key, showWarning) {
    // Deletes given key and displays a message describing the status of the deletion
    //    ("Key deleted" if key deleted and "No key to delete" if no key to delete)
    //    Then it resets the #currentKeyName field
    if (typeof showWarning === "undefined" || showWarning == null || showWarning){
        let textEntry = currentKeyName
        if (currentKeyName == null ) {
            textEntry = "your key"
        }
        return askUser("Are you sure you want to delete " + currentKeyName + "?", [
            {
                "Delete Key": function() {
                    deleteKey(key, false);
                }
            },
            {
                "Cancel": null
            }
        ]);
    }
    return fetch(baseURL + "/yubikeys/delete-key/?key_id=" + key.id, {
      method: "DELETE",
      headers: AuthenticationHeaders(currentToken, "application/json"),
      body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(data => {
        if (data.response === "success") {
            displayMessage("Key Deleted", "success");
            unloadKeyData(key);
        }
        else if (data.response === "failure") {
            throw new Error(data.reason);
            // displayMessage("Key delete failed: " + data.reason, "error");
            // unloadKeyData(key);
        }
        else {
            throw new Error(data);
            // displayMessage("Key unable to delete with response: " + data, "error");
        }
    })
    // .catch(error => displayMessage("Unable to delete key with error: " + error, 'error'));

}

async function buttonClick(event){
    // This function processes any included operations and returns event
    let btnAction = event.target.dataset.operation;
    if (btnAction === "undefined" || btnAction == null) {
        return event;
    }
    if (btnAction.includes("open")) {
        var page = btnAction.substring(4);
        openPage(page);
    }
    else {
        switch (btnAction) {
            case "logout":
                return logout();
            case "edit-key":
                //Get key-id from the event's target
                    // and then display the edit-key page 
                    // same as new-key but with autofilled 
                    // previous keys values and new title
                break;
            case "copy-key":
                //  Copy the key and display a success message
                break;
            case "fill-key":
                // TODO: Only show fill-option when element is fillable
                // Put fill element inline input using injection like psw manager
                // See if I can get through duo without clearing messages 
                // Only autologin if checked, and never clear messages except
                // dumb ones first time (not after)
                break;
            case "showadvanced":
                document
                  .getElementById("advanced-settings")
                  .classList.toggle("closed");
                if (event.target.innerHTML == "Show"){
                  event.target.innerHTML = "Hide";
                }
                else {
                  event.target.innerHTML = "Show";
                }
                break;
            case "back":
                return runIfExternal(()=>{history.back();}, ()=>{
                  const currentPage = document.querySelector("div.current");
                  const nextPage = pages[currentPage.id.substr(0, currentPage.id.length - 5)].parent;
                  return openPage(nextPage);
                });
            default:
                console.log("Weird button pressed: " + event.target.id);
                return event;
        }
    }
    event.preventDefault();
    return event;
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

async function addUserElements(pageId){
  // User elements to page (current key name and username)
  // Displays "No key" if no key currently available
  var page = document;
  if (typeof pageID !== "undefined" && pageID != null) {
    page = document.getElementById(pageID);
  }
  
  if (currentUsername == null || currentToken == null) {
      return Promise.all([unloadKeyData(), unloadUserData()]);
  }
  else {
      //TODO: Add username and key elements
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
  
function loadKeys(page) {
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

async function accessCachedKeys(query){
    // Query is a json object of key-value pairs where
    //    the query keys match attributes of the
    //    cached content.
    // Response is a json object containing 
    //    All matching keys
    // Cached keys are stored in a database of the format
    // Key id: {
        // name: Key name,
        // site: key url,
        // secret_key: encrypted secret key,
        // private_id: encrypted private id,
        // public_id: encrypted public_id,
        // usage_counter: usage counter,
        // session_counter: session counter
    // }
}

async function handleError(error) {
    // Error is any object, string, or error. 
    // Possibly index them and display code with short description
    console.error(error);
}

async function displayMessage(message, type){
    
}

async function addFormListeners(section){
  for (let form of section.getElementsByTagName("form")) {
    form.addEventListener("submit", submitForm);
  }
}

async function addButtonListeners(section){
  for (let potentialButton of section.querySelectorAll("button[data-operation], span[data-operation]")){
      potentialButton.addEventListener("click", buttonClick);
  }
}

async function addInputListeners(section){
  for (let input of section.getElementsByTagName("input")) {
      input.addEventListener("change", inputChanged);
      if (input.dataset.listener) {
        input.addEventListener("input", inputUpdated);
      }
  }
}

async function addPageElements(pageId){
  let page = document;
  if (pageId) {
    page = document.getElementById(pageId);
  }
  addFormListeners(page);
  addInputListeners(page);
  addButtonListeners(page);
}

function closePage(currentURL) {
    var tabQuery = browser.tabs.getCurrent();
    tabQuery
        .then(tab => browser.tabs.remove(tab.id))
        .catch(error => {
            console.error("Error removing external page: \n" + error);
        });
}

async function runIfExternal(ifTrue, ifFalse) {
  // TODO: Get this fixed. Replace with "Run in activetab" if not possible
  let url = new URL(window.location.href);
  let location = url.searchParams.get("location");
  if (typeof location !== "undefined" && location === "internal9500" ){
    return ifFalse();
  }
  else {
    return ifTrue();
  }
}

async function openPageExternal(pageLocation) {
  return runIfExternal(()=>{window.location.href = pageLocation;}, 
      ()=>{browser.tabs.create({url: pageLocation});});
}

async function openPage(pageId) {
  let pageProperties = pages[pageId];
  if (pageProperties.external) {
      return openPageExternal(HTML_ROOT + pageId + ".html");
  }
  else {
    let pageIdFull = pageId + "-page";
    var oldPage = document.querySelectorAll("div.current");
    if (typeof oldPage !== "undefined" && oldPage != null) {
        for (let page of oldPage) {
            let oldPageClassList = page.classList;
            oldPageClassList.remove("current");
            oldPageClassList.add("hidden");
        }
    }
    document.getElementById("main-title")
      .innerHTML = pageProperties.title;
    var newPage = document.getElementById(pageIdFull);
    newPage.classList.add("current");
    if (pageProperties.parent != null && (!pageProperties.external || pageProperties.overrideBack)){
      document.getElementById("main-back-button").classList.remove("hidden");
    }
    else {
      document.getElementById("main-back-button").classList.add("hidden");
    }
    newPage.classList.remove("hidden");
  }
}

function initializePage(){
  fetch("javascript-es6/pages.json")
    .then(response=>response.json())
    .then(data => {
        pages = data;
        // console.log("Page loaded");
        addPageElements();
        addUserElements();
        let pageId = document.querySelector("div.current").id;
        pageId = pageId.substring(0, pageId.length - 5);
        let pageProperties = pages[pageId];
        if (pageProperties.parent != null && (!pageProperties.external || pageProperties.overrideBack)){
            document.getElementById("main-back-button").classList.remove("hidden");
        }
        else {
            document.getElementById("main-back-button").classList.add("hidden");
        }
    })
    .catch(handleError);
}

document.addEventListener("DOMContentLoaded", initializePage);