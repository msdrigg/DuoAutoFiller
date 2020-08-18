// IF CHROME, TOGGLE THESE TWO LINE COMMENTS
let browserProxy = browser;
// let browserProxy = chrome;

let pages = "";
fetch("javascript/pages.json")
    .then(response=>response.json())
    .then(data => {
        pages = data;
    })
    .catch(handleError);

async function submitForm(event){
    // TODO: THIS
}

async function inputUpdated(event){
    // TODO: THIS
}

async function inputChanged(event){
    // TODO: THIS
}

async function logout(){
    // TODO: THIS
}

async function askUser(){
    
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
                await logout();
                return 
                break;
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
      input.addEventListener("input", inputUpdated);
  }
}

async function addPageElements(pageId){
  let page = document.getElementById(pageId);
  addFormListeners(page);
  addInputListeners(page);
  addButtonListeners(page);
}

async function openPageExternal(pageLoaction) {
    return browser.tabs.create({url: pageLocation});
}

async function openPage(pageId) {
  if (pages[pageId].external) {
      return openPageExternal(pageId + ".html");
  }
  
  var oldPage = document.querySelectorAll("div.current");
  if (typeof oldPage !== "undefined" && oldPage != null) {
      for (let page of oldPage) {
          let oldPageClassList = page.classList;
          oldPageClassList.remove("current");
          oldPageClassList.add("hidden");
      }
  }
  
  var newPage = document.getElementById(pageId + "-page");
  newPage.classList.add("current");
  newPage.classList.remove("hidden");
  
  addPageElements(newPage);
  addUserElements(pageID);
  
  if (message !== 'undefined' && message != null) {
    return displayMessage(message);
  }
}
