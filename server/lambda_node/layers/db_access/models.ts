import { KeyContext } from "../model/keys";
import { PasswordInfo } from "../model/users";

export interface DatabaseRow {
    PKCombined: string,
    SKCombined: string
}

export interface DatabaseUser extends DatabaseRow {
    PasswordInfo: PasswordInfo,
    Context: any,
    Temporal: number
}

export interface DatabaseKey extends DatabaseRow {
    Context: KeyContext,
    Key: string,
    UseCounter: number,
    Temporal: number,
}

export interface UserUpdate {
    Context?: Object,
    Email?: string,
    PasswordHash?: string,
}

export interface DatabaseSession extends DatabaseRow {
    Key: string,
    Context: SessionContext,
    Temporal: number
}


/**
 * @typedef DynamoError
 * @property {string} [code] The code identifying the error that occured
 * @property {boolean} [retryable] Whether or not the operation can succeed if retried
 * @property {number} [statusCode] The response code from the service
 * @property {Date} [time] The date time from when the error occured
 * @property {string} [hostname] Set when networking error occurs to identify the endpoint
 * @property {string} [region] Set when networkoing error occurs to identify the region
 */
