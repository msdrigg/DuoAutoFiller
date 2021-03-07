//Handles external pages
function closePage(currentURL) {
    var tabQuery = browser.tabs.getCurrent();
    tabQuery
        .then(tab => browser.tabs.remove(tab.id))
        .catch(error => {
            console.error("Error removing external page: \n" + error);
        });
}

function disableMainPage() {
    document.getElementById("page-wrapper").classList.add("disabled");
}

function enableMainPage() {
    document.getElementById("page-wrapper").classList.remove("disabled");
}

function handleExternalEvents(event) {
    let action = "";
    if (event.target.getAttribute("operation")) {
        action = event.target.getAttribute("operation");
    }
    else if (event.action) {
        action = event.action;
    }
    switch (action) {
        case "closepage":
            event.preventDefault();
            browser.tabs.getCurrent()
                .then(tab => closePage(tab.url));
        break;
        default:
        break;
    }
}

function buttonClick(event) {
    localizedButtonClick(event)
        .then(event => handleExternalEvents(event));
}

function submitForm(event) {
    localizedFormSubmit(event)
        .then(event=> handleExternalEvents(event));
}

function inputHandler(event) {
    localizedInputHandler(event);
}

function initializePage() {
  var savedUser = browser.storage.sync.get({"username": null, "token": null});
  function onError(error) {
    console.log("Error getting user: " + error);
  }
  savedUser.then(savedUser => {
    if (typeof savedUser !== "undefined" && savedUser != null) {
      if (savedUser.token != null && savedUser.username != null) {
          currentUsername = savedUser.username;
          currentToken = savedUser.token;
          addUserElements(null);
      }
    }
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
  for (let form of document.getElementsByTagName("form")) {
      form.addEventListener("submit", submitForm);
  }
  for (let button of document.getElementsByTagName("button")){
    if (button.type === "button") {
      button.addEventListener("click", buttonClick);
    }
  }
  for (let input of document.getElementsByTagName("input")) {
      input.addEventListener("change", inputChange);
  }
  for (let input of document.getElementsByTagName("input")) {
      input.addEventListener("input", inputHandler);
  }
}
