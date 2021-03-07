// background.js handles all syncing of the database

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


// IF CHROME, TOGGLE THESE TWO LINE COMMENTS
let browserProxy = browser;
// let browserProxy = chrome;

const SYNC_ALARM_NAME = "autoauthenticate-sync-9858324374";
let lastSyncTime = 0;
const POPUP_SCRIPT_ID = "POPUP_AUTOAUTHENTICATE_23049098"

async function handleMessage(message, sender, sendResponse) {
  if (message.source == POPUP_SCRIPT_ID) {
      //TODO: Implement this
      switch (message.event) {
          case "sync":
            await setupSyncOperation();
            return syncStorage();
            break;
          case "start":
            //DO I NEED TO PASS ANY AUTHENTICATION HEADERS IN HERE?
            startSyncOperation(true)
            break;
      }
      sendResponse({response: "success"});
  };
}


async function checkKeyCache(){
    await let cachedKeys = accessCachedKeys();
    return loadKeyCache(cachedKeys);
}

async function loadKeyCache(existingKeys){
    //TODO: THIS
    // Existing keys is a json array of 
    //   key_id: md5 hash
    // ServerResponse with array of
    //   key_id: content
    //   for all not-matching key_ids
}

async function setupSyncOperation(){
    //TODO: THIS
    // Initialize all persistent variables (database acces, etc.)
    // Replace if they are already here
}

async function stopSyncOperation(){
    return browser.alarms.clear(SYNC_ALARM_NAME);
}

async function startSyncOperation(repeatCycle){
    let repeating = true;
    if (repeatCycle !== 'undefined' && repeatCycle != null){
        repeating = repeatCycle;
    }
    await setupSyncOperation();
    if (!repeating){
        stopSyncOperation();
        return syncStorage();
    }
    else {
        browser.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name == SYNC_ALARM_NAME) {
                syncStorage();
            }
        })
        await stopSyncOperation()
        return browser.alarms.create(SYNC_ALARM_NAME, {"periodInMinutes", 15});
    }
}

async function syncStorage(){
    //TODO: THIS
    // Sync the storage.
        // Upload last_sync_time and server responds with all new changes
        // Add new keys and update last_sync_time
}

browserProxy.runtime.onMessage.addListener(handleMessage);
