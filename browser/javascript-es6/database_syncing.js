// Functions in this script control local 

async function messageBackground(dictMsg) {
    return browser.runtime.sendMessage(dictMsg)
      .then(response => {
        if (!response.ok) {
            throw Error("Unable to message background script");
        }
    });
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

