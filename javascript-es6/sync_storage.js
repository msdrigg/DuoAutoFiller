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

// Store keys in database storage encrypted
 
const SYNC_ALARM_NAME = "autoauthenticate-sync-9858324374";
let lastSyncTime = 0;

async function checkKeyCache(){
    await let cachedKeys = accessCachedKeys();
    return loadKeyCache(cachedKeys);
}

async function loadKeyCache(existingKeys){
    // Existing keys is a json array of 
    //   key_id: md5 hash
    // ServerResponse with array of
    //   key_id: content
    //   for all not-matching key_ids
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
