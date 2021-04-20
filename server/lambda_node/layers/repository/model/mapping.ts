import { ResponsibleError } from "../../model/common";
import { FrontendKey } from "../../model/keys";
import { AuthUser, CoreUser, PasswordInfo } from "../../model/users";
import constants from "../../utils/constants";
import httpUtils from "../../utils/httpUtils";
import { isAWSError } from "./errors";
import { DatabaseKey, DatabaseSession, DatabaseUser } from "./models";
import { isRetryableByTrait, isThrottlingError, isTransientError, isClockSkewError } from "@aws-sdk/service-error-classification";

export function getCoreUser(databaseUser: DatabaseUser): CoreUser {
    return {
        Email: databaseUser.PKCombined,
        Context: databaseUser.Context
    };
}

export function createDatabaseUser(authUser: AuthUser): DatabaseUser {
    let passwordSalt = httpUtils.getRandomString(64);
    let hashFunction = constants.DEFAULT_HASH_FUNCTION;
    let newPasswordInfo: PasswordInfo = {
        HashFunction: hashFunction,
        Salt: passwordSalt,
        StoredHash: httpUtils.hashSalted(
            authUser.PasswordHash,
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

export function getFrontendSession(databaseSession: DatabaseSession): FrontendSession {
    return {
        Key: databaseSession.Key,
        Id: databaseSession.SKCombined.slice(2),
        Context: databaseSession.Context,
        Expiration: new Date(databaseSession.Temporal)
    };
}

export function getDatabaseSession(userEmail: string, frontendSession: FrontendSession): DatabaseSession {
    return {
        Key: frontendSession.Key,
        PKCombined: userEmail,
        SKCombined: "S#" + frontendSession.Id,
        Context: frontendSession.Context,
        Temporal: frontendSession.Expiration.getTime()
    };
}

export function getFrontendKey(databaseKey: DatabaseKey): FrontendKey {
    return {
        Id: databaseKey.SKCombined.slice(2),
        Context: databaseKey.Context,
        UseCounter: databaseKey.UseCounter,
        LastContentUpdate: new Date(databaseKey.Temporal),
        Key: databaseKey.Key
    }
}

export function getDatabaseKey(userEmail: string, frontendKey: FrontendKey): DatabaseKey {
    return {
        Context: frontendKey.Context, 
        Key: frontendKey.Key,
        UseCounter: frontendKey.UseCounter,
        Temporal: frontendKey.LastContentUpdate.getTime(),
        SKCombined: "K#" + frontendKey.Id,
        PKCombined: userEmail
    }
}

export function getResponsibleError(error: any): ResponsibleError {
    if (isAWSError(error)) {
        // Handle AWS Error
        return {
            name: error.name,
            message: error.message,
            reason: error,
            statusCode: error.$metadata?.httpStatusCode || 500,
            isRetryable: isRetryableByTrait(error),
            isThrottling: isThrottlingError(error),
            isServiceError: error.$fault == "server" || error.$service !== undefined,
            isTransientError: isTransientError(error),
            isClockSkewError: isClockSkewError(error)
        }
    } else {
        // Handle some other unknown error
        return {
            name: "UnknownError",
            message: "Unknown Error",
            reason: error,
            statusCode: 500,
            isRetryable: false,
            isServiceError: false,
            isThrottling: false,
            isTransientError: false,
            isClockSkewError: false
        }
    }
}