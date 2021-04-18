import { AuthUser, CoreUser, PasswordInfo } from "../model/users";
import constants from "../utils/constants";
import httpUtils from "../utils/httpUtils";
import { DatabaseKey, DatabaseSession, DatabaseUser } from "./models";

export function getCoreUser(databaseUser: DatabaseUser): CoreUser {
    return {
        email: databaseUser.PKCombined,
        context: databaseUser.context
    };
}

export function createDatabaseUser(authUser: AuthUser): DatabaseUser {
    let passwordSalt = httpUtils.getRandomString(64);
    let hashFunction = constants.DEFAULT_HASH_FUNCTION;
    let newPasswordInfo: PasswordInfo = {
        hashFunction: hashFunction,
        salt: passwordSalt,
        storedHash: httpUtils.hashSalted(
            authUser.passwordHash,
            passwordSalt,
            hashFunction
        )
    };
    return {
        PKCombined: authUser.email,
        SKCombined: "M#",
        context: authUser.context,
        temporal: Date.now(),
        passwordInfo: newPasswordInfo
    };
}

export function getFrontendSession(databaseSession: DatabaseSession): FrontendSession {
    return {
        key: databaseSession.key,
        id: databaseSession.SKCombined.slice(2),
        context: databaseSession.context,
        expiration: new Date(databaseSession.temporal)
    };
}

export function getDatabaseSession(userEmail: string, frontendSession: FrontendSession): DatabaseSession {
    return {
        key: frontendSession.key,
        PKCombined: userEmail,
        SKCombined: "S#" + frontendSession.id,
        context: frontendSession.context,
        temporal: frontendSession.expiration.getTime()
    };
}

export function getFrontendKey(databaseKey: DatabaseKey): FrontendKey {
    return {
        id: databaseKey.SKCombined.slice(2),
        context: databaseKey.context,
        useCounter: databaseKey.useCounter,
        lastContentUpdate: new Date(databaseKey.temporal),
        key: databaseKey.key
    }
}

export function getDatabaseKey(userEmail: string, frontendKey: FrontendKey): DatabaseKey {
    return {
        context: frontendKey.context, 
        key: frontendKey.key,
        useCounter: frontendKey.useCounter,
        temporal: frontendKey.lastContentUpdate.getTime(),
        SKCombined: "S#" + frontendKey.id,
        PKCombined: userEmail
    }
}