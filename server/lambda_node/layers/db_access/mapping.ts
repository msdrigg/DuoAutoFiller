import { AuthUser, CoreUser, PasswordInfo } from "../model/users";
import constants from "../utils/constants";
import httpUtils from "../utils/httpUtils";
import { DatabaseUser } from "./models";

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