// This file controls interaction with the server. All code is funneled through here

let currentUsername = "";
let currentToken = "";
const baseURL = "https://spero.space";

const LOGIN_ACTION = "/users/login/";


async function logout(){
    // TODO: THIS
}

async function uploadFormData(urlEnding, formData){
    return fetch(baseURL + urlEnding, {
        method: "POST",
        credentials: 'include',
        body: formData
    })
}

export async function getCredentials(email, password) {
    return fetch(baseURL + "/users/login/", {
            credentials: 'include',
            body: JSON.stringify({"email": email, "password": password}),
            method: "POST"
      })
      .then(response => {
          if (response.status == 401) {
              raise Error("Authentication Failed. Incorrect username or password.");
          }
          if (!response.ok) {
              return response.json()
                .then(data => {raise Error("Authentication Failed. Reason: " + data.reason)});
          }
      })
}

async function checkCredentials() {
    return fetch(baseURL, "/users/check/", {
        credentials: 'include',
        method: "POST",
    })
        .then(response => {
            if (response.ok){
                return true;
            }
            if (response.status == 403 || response.status == 401) {
                return false;
            }
            return response.json()
                .then(data => {throw Error("Authentication Failed. Reason: " + data.reason)});
        })
}

export async function getDecryptionKey() {
    return fetch(baseURL, "/users/session-key/", {
        credentials: 'include',
        method: "POST",
    })
        .then(response.json())
        .then(data => {
            if (data.result == "success"){
                return data.sessionKey
            }
            else if (data.reason){
                throw Error("Session key not loaded because: " + data.reason);
            }
            else {
                throw Error(data);
            }
        })
}

export async function deleteKey(key, showWarning) {
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
