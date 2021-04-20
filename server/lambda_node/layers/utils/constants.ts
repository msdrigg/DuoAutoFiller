import { LambdaResponse } from "../routing/types";
import { HashFunction } from "./../model/users"
export const TABLE_NAME = "AutoAuthenticateUnified";
export const INDEX_NAME = "GSITemporal";
export const DEFAULT_HASH_FUNCTION: string = HashFunction.SHA512;
export const EMAIL_COOKIE_NAME = "UserEmail";
export const SESSION_COOKIE_NAME = "SessionID";
export const MAX_SESSION_LENGTH_SECONDS = 30 * 24 * 3600;
export const OK_MODEL = {
    Result: "Success"
};
export const OK_RESPONSE: LambdaResponse = OK_MODEL;
export const UPDATEABLE_USER_METADATA = [
    'Phone',
    'EmailBackup'
];
export const TRACKED_USER_METADATA = [
    "Phone",
    "EmailBackup", 
    "DateJoined"
];

export default {
    TRACKED_USER_METADATA,
    UPDATEABLE_USER_METADATA,
    OK_MODEL,
    MAX_SESSION_LENGTH_SECONDS,
    SESSION_COOKIE_NAME,
    EMAIL_COOKIE_NAME,
    DEFAULT_HASH_FUNCTION,
    TABLE_NAME,
    INDEX_NAME
};
