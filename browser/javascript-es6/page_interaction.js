import uploadFormData from "server_contact"

async function submitForm(event){
    let form = event.target;
    if (typeof form.action === "undefined" || form.action == null){
        return event;
    }
    event.preventDefault();
    let submittedForm = new FormData();
    for (input of form.getElementsByTagName("input")) {
        if (typeof input.name !== "undefined" && input.name != null){
            submittedForm.append(input.name, input.value.replace(/\s/g, ''));
        }
    }
    return uploadFormData(form.action, submittedForm)
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


async function askUser(){
    
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

async function displayMessage(message, type){
    
}

async function addFormListeners(pageDocument, listener){
  for (let form of pageDocument.getElementsByTagName("form")) {
    form.addEventListener("submit", listener);
  }
}

async function addButtonListeners(pageDocument, listener){
  for (let potentialButton of pageDocument.querySelectorAll("button[data-operation], span[data-operation]")){
    potentialButton.addEventListener("click", listener);
  }
}

async function addInputUpdateListener(pageDocument, listener){
  for (let input of pageDocument.getElementsByTagName("input")) {
    input.addEventListener("change", listener);
  }
}

async function addInputUpdateListeners(pageDocument, listener){
  for (let input of pageDocument.getElementsByTagName("input")) {
    input.addEventListener("input", listener);
  }
}

async function addBasePageListeners(pageDocument){
    addFormListener(pageDocument, submitForm);
    addInputChangedListener(pageDocument, inputChanged);
    addInputUpdateListener(pageDocument, inputUpdated);
}

async function handleError(error) {
    // Error is any object, string, or error. 
    // TODO: Possibly index them and display code with short description
    console.error(error);
}

function closePage(currentURL) {
    var tabQuery = browser.tabs.getCurrent();
    tabQuery
        .then(tab => browser.tabs.remove(tab.id))
        .catch(error => {
            console.error("Error removing external page: \n" + error);
        });
}

async function openPageExternal(pageLocation) {
    return browser.tabs.create({url: pageLocation});
}

async function pivotPage(pageObject, pageDocument) {
    let pageId = pageObject.id;
    let pageIdFull = pageId + "-page";
    if (pageObject.parent != null){
        pageDocument.getElementById("main-back-button").classList.remove("hidden");
    }
    else {
        pageDocument.getElementById("main-back-button").classList.add("hidden");
    }
    var oldPage = pageDocument.querySelectorAll("div.current");
    if (typeof oldPage !== "undefined" && oldPage != null) {
      for (let page of oldPage) {
          let oldPageClassList = page.classList;
          oldPageClassList.remove("current");
          oldPageClassList.add("hidden");
      }
    }

    pageDocument.getElementById("main-title")
        .innerHTML = pages[pageId].title;
    var newPage = pageDocument.getElementById(pageIdFull);
    newPage.classList.add("current");
    newPage.classList.remove("hidden");
}
