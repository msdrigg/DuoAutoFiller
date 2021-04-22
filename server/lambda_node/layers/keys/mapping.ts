import { CoreKey } from "."
import { httpUtils } from "../common"
import { CreationKey } from "./model"
import { DatabaseKey } from "./repository"


export function getFrontendKey(databaseKey: DatabaseKey): CoreKey {
    return {
        Id: databaseKey.SKCombined.slice(2),
        Context: databaseKey.Context,
        UseCounter: databaseKey.UseCounter,
        LastContentUpdate: new Date(databaseKey.Temporal),
        Key: databaseKey.Key
    }
}

export function getDatabaseKey(userEmail: string, frontendKey: CoreKey): DatabaseKey {
    return {
        Context: frontendKey.Context, 
        Key: frontendKey.Key,
        UseCounter: frontendKey.UseCounter,
        Temporal: frontendKey.LastContentUpdate.getTime(),
        SKCombined: "K#" + frontendKey.Id,
        PKCombined: userEmail
    }
}

export function createDatabaseKey(userEmail: string, frontendKey: CreationKey): DatabaseKey {
    return {
        Context: frontendKey.Context, 
        Key: frontendKey.Key,
        UseCounter: frontendKey.UseCounter || 0,
        Temporal: Date.now(),
        SKCombined: "K#" + httpUtils.getRandomString(64),
        PKCombined: userEmail
    }
}