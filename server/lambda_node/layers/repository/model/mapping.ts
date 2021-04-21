import { ErrorType, ResponsibleError } from "../../model/common";
import { FrontendKey } from "../../model/keys";
import { CoreUser, PasswordInfo, UserAuthChallenge } from "../../model/users";
import constants from "../../utils/constants";
import httpUtils from "../../utils/httpUtils";
import { isAWSError } from "./errors";
import { DatabaseKey, DatabaseSession, DatabaseUser } from "./models";
import { isRetryableByTrait, isThrottlingError, isTransientError, isClockSkewError } from "@aws-sdk/service-error-classification";
import { FrontendSession } from "../../model/sessions";

export function getCoreUser(databaseUser: DatabaseUser): CoreUser {
    return {
        Email: databaseUser.PKCombined,
        Context: databaseUser.Context
    };
}

export function createDatabaseUser(authUser: UserAuthChallenge): DatabaseUser {
    const passwordSalt = httpUtils.getRandomString(64);
    const hashFunction = constants.DEFAULT_HASH_FUNCTION;
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

export function getResponsibleError(error: unknown): ResponsibleError {
    if (isAWSError(error)) {
        // Handle AWS Error
        let name: ErrorType;
        if (error.$fault == "server") {
            name = ErrorType.DynamoDBError
        } else {
            name = ErrorType.ServerError
        }
        return {
            name: name,
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
        let usableError: Error;
        if (error !== undefined && (error as Error).name !== undefined) {
            usableError == error as Error;
        } else {
            usableError = new Error("Unknown error cause");
        }
        return {
            name: ErrorType.UnknownError,
            message: "Unknown Error",
            reason: usableError,
            statusCode: 500,
            isRetryable: false,
            isServiceError: false,
            isThrottling: false,
            isTransientError: false,
            isClockSkewError: false
        }
    }
}


export function createResponsibleError(name: ErrorType, message: string, statusCode?: number, reason?: Error): ResponsibleError {
    return {
        name: name,
        message: message,
        reason: reason,
        statusCode: statusCode,
        isRetryable: false,
        isThrottling: false,
        isTransientError: false,
        isClockSkewError: false,
        isServiceError: false
    }
}