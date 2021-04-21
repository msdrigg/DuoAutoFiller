import { CoreUser, UserAuthChallenge, PasswordInfo } from ".";
import { httpUtils } from "../common";
import { HashFunction } from "./model";
import { DatabaseUser } from "./repository";


export function getCoreUser(databaseUser: DatabaseUser): CoreUser {
    return {
        Email: databaseUser.PKCombined,
        Context: databaseUser.Context
    };
}

export function createDatabaseUser(authUser: UserAuthChallenge): DatabaseUser {
    const passwordSalt = httpUtils.getRandomString(64);
    const hashFunction = HashFunction.DEFAULT;
    const newPasswordInfo: PasswordInfo = {
        HashFunction: hashFunction,
        Salt: passwordSalt,
        StoredHash: httpUtils.hashSalted(
            authUser.PasswordInput,
            passwordSalt,
            hashFunction
        )
    };
    return {
        PKCombined: authUser.Email,
        SKCombined: "M#",
        Context: authUser.Context,
        Temporal: Date.now(),
        PasswordInfo: newPasswordInfo
    };
}
