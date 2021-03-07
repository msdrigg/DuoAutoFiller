// This file controls the quering from the database
// It needs to store the unencrypted vault key and have sole access to the stored keys
// It needs methods for querying and for updating keys. 
// It is independent of the syncing, and it does not need to run in the background

async function queryDatabase(queryString) {
    // This query is a string that is used to search for key_names and url's use matches (or near matches if possible) to find keys
        // Return json object of keys containing key_name, key_url and key_id.
        // All future interaction with keys will occur through key_id's
        // A blank query string matches anything
    // Possibly optimize this. 
        // Cache queries if possible
        // Move entire database into memory for the duration of the process
        // BUILD BEFORE OPTIMIZING
    
}
