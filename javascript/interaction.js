//TODO: Make sure user page elements are unloaded and loaded for all user pages
//  Test everything
//  

var currentUsername = null;
var baseURL = "https://spero.space";

var userPages = [
  'home-page', 
  'newkey-page'
];

var watchedForms = {
  "login-form": function(e) {
    e.preventDefault();
    submitForm("login-form");
  },
  "newkey-form": function(e) {
    e.preventDefault();
    submitForm("newkey-form");
  },
  "resetpassword-form": function(e) {
    e.preventDefault();
    submitForm("newkey-form");
  },
  "signup-form": function(e) {
    e.preventDefault();
    submitForm("newkey-form");
  },
};

var watchedButtons = {
  "logout-button": logout,
  "deletekey-button": deleteKey,
  "opensignup-button": function() {
    openPage("signup-page");
  },
  "openforgotpassword-button": function() {
    openPage("forgotpassword-page");
  },
  "openhome-button": function() {
    openPage("signup-page");
  },
  "opennewkey-button": function() {
    openPage("newkey-page");
  },
  "openlogin-button": function() {
    openPage("login-page");
  },
};

function initializePage() {
  var savedUser = browser.storage.sync.get("user");
  function onError(error) {
    console.log(`Error getting user: ${error}`);
    openPage("login-page");
  }
  savedUser.then(user => {
    if (user) {
      console.log(user);
      currentUsername = user.username;
      openPage("home-page");
    }
    else {
      openPage("login-page");
    }
  }, onError);;
}

function displayMessage(message, type) {
  // Display the message as a small slider with menu saying "dismiss"
  var messageMenu = document.querySelector("div#message-menu");
  messageMenu.classList.remove("hidden");
  if (typeof type !== undefined && type != null ) {
    messageMenu.classList.add("type-" + type);
  }
  else {
    messageMenu.classList.add("type-default");
  }
  messageMenu.querySelector("div#message-content").innerHTML = message;
}

function checkUser(user) {
  // Checks user information against database, returns true, false
  // Returns a promise
  return fetch(baseURL + "/users/check", {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user)
    })
    .then(response => response.json())
    .then(data => {
      if (data.result === "success") {
        return true;
      }
      else {
        return false;
      }
    });
}

function dismissMessage() {
  var messageMenu = document.querySelector("div#message-menu");
  // Clear classlist to remove all "type" elements. If we need other classes here, add an additional div
  messageMenu.className = "";
  messageMenu.classList.add("hidden");
  messageMenu.querySelector("div#message-content").innerHTML = "";
}

function deleteKey() {
  // Deletes current key and displays a message describing the status of the deletion
  //    ("Key deleted" if key deleted and "No key to delete" if no key to delete)
  //    Then it resets the #currentKeyName field

}

function logout() {
  // Delete user from stoage
  // Unload all user information from page
}

function addUserElements(pageID) {
  // User elements to page (current key name and username)
  // Displays "No key" if no key currently available
}

function login(e) {
  e.preventDefault();
  user = {
    username: document.querySelector("#username").value,
    password: document.querySelector("#password").value
  };
  if (validatePassword(user.password)) {

  }
  else {
    checkUser(user)
      .then(result => {
        if (result) {
          browser.storage.sync.set(JSON.stringify({"user": user});
          openPage("home-page");
        }
        else {
          displayMessage("Username or password is incorrect", 'warning');
        }
      })
      .catch(error => {
        console.log(error);
        displayMessage("Login failed to load", 'error');
      })
  }
}

function openPage(pageID, message) {
  console.log("Opening page: " + pageID);
  var oldPageClassList = document.querySelector("div.current").classList;
  oldPageClassList.remove("current");
  oldPageClassList.add("hidden");
  var currentPage = document.querySelector("div#" + pageID);
  currentPage.classList.add("current")
  currentPage.classList.remove("hidden");
  currentPage.querySelectorAll("form").forEach( form => {
    if (form.id !== 'undefined' && form.id in watchedForms) {
      form.addEventListener("submit", watchedForms[form.id]);
    }
  });
  currentPage.querySelectorAll("button").forEach( button => {
    if (button.id !== 'undefined' && button.id in watchedButtons) {
      button.addEventListener("click", watchedButtons[button.id]);
    }
  });
  finalizePage(pageID);
  if (message !== 'undefined' && message != null) {
    displayMessage(message);
  }
}

function submitForm(event) {

}

document.addEventListener("DOMContentLoaded", initializePage);
