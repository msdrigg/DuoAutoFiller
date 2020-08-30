// This page is the entry point for external page javascript

import * as database from "database_syncing";
import * as interaction from "page_interaction";
import * as server from "server_contact";
import * as encryption from "encryption";


const POPUP_SCRIPT_ID = "POPUP_AUTOAUTHENTICATE_23049098"
let pages = "";

async function externalButtonHandler() {
    if (/^open.*$/.test(btnAction)) {
        var page = btnAction.substring(4);
        if (pages[page].external) {
            interaction.openPageExternal(page);
        }
        else {
            interaction.pivotPage(pages[page]);
        }
    }
    if (/^link.*$/.test(btnAction)) {
        var page = btnAction.substring(4);
        window.location = '/html/' + page + '.html';
    }
    else {
        switch (btnAction) {
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
                history.back();
            default:
                console.log("Weird button pressed: " + event.target.id);
                return event;
        }
    }
    event.preventDefault();
    return event;
}

async function initializePage(){
  fetch("javascript-es6/pages.json")
    .then(response=>response.json())
    .then(data => {
        pages = data;
        let initialPage = "default";
        if (document.body.dataset.initialpage) {
          initialPage = document.body.dataset.initialpage;
        }
        interaction.openPage(initialPage);
        addPageElements();
        addUserElements();
        
        if (pages[initialPage].parent != null && (!pages[initialPage].external || pages[initialPage].overrideBack)){
            document.getElementById("main-back-button").classList.remove("hidden");
        }
        else {
            document.getElementById("main-back-button").classList.add("hidden");
        }
    })
    .catch(handleError);
}

document.addEventListener("DOMContentLoaded", initializePage);