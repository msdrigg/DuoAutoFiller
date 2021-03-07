//This file handles the encryption and decryption of stored information
import {pbkdf2, createHash} from 'crypto';


async function storeEncryptedKey(encrypted_vault_key) {
    
}

async function retrieveEncryptedKey() {
    
}

async function hashSHA(inputData){
    // Input data is a buffer that gets hashed one time
    const shaHash = crypto.createHash('sha256');
    shaHash.update(inputData)
    return shaHash.digest('hex');
}

async function decrypt(input_text, vault_key) {
    
}

async function decrypt(input_text, vault_key) {

}

async function generateVaultKey(username, password) {
    return new Promise((resolve, reject)) => {
        crypto.pbkdf2(password, username, 100100, 256, 'sha256', (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve(data);
        })
    });
}
