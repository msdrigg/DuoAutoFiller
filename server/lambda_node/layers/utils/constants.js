export const TABLE_NAME = "AutoAuthenticateUnified";
export const INDEX_NAME = "GSITemporal";
export const DEFAULT_HASH_FUNCTION = 'sha512';
export const EMAIL_COOKIE_NAME = "UserEmail";
export const SESSION_COOKIE_NAME = "SessionID";
export const MAX_SESSION_LENGTH_SECONDS = 30 * 24 * 3600;
export const OK_MODEL = {"Result": "Success"};
export const UPDATEABLE_USER_METADATA = [
    'phone',
    'emailBackup'
];
export const TRACKED_USER_METADATA = [
    "phone",
    "emailBackup", 
    "dateJoined"
];
