// This page is the entry point for internal page javascript

import * as database from "database_syncing";
import * as interaction from "page_interaction";
import * as server from "server_contact";
import * as encryption from "encryption";


const POPUP_SCRIPT_ID = "POPUP_AUTOAUTHENTICATE_23049098"
let pages = "";

async function internalButtonHandler() {
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
            case "back":
                const currentPage = document.querySelector("div.current");
                const nextPage = pages[currentPage.id.substr(0, currentPage.id.length - 5)].parent;
                return interaction.pivotPage(pages[nextPage]);
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
        if (document.body.dataset.initialpage) {
          let initialPage = document.body.dataset.initialpage;
          interaction.pivotPage(document, pages[initialPage]);
        }
        interaction.addBasePageListeners(document);
        interaction.addUserElements(document);
        interaction.addButtonListeners(document, internalButtonHandler);
    })
    .catch(interaction.handleError);
}

document.addEventListener("DOMContentLoaded", initializePage);