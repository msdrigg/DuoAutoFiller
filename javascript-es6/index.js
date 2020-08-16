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

async function openPageExternal(pageLoaction) {
    return browser.tabs.create({url: pageLocation});
}

async function loadPage(pageId) {
  if (pages[pageId].external) {
      return openPageExternal(pageId + ".html");
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

async function handleError(error) {
    
}

