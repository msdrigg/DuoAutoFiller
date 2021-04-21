export type ResponsibleError = {
    name: ErrorType,
    message: string,
    reason?: Error,
    requestId?: string,
    statusCode: number,
    isRetryable: boolean,
    isThrottling: boolean,
    isServiceError: boolean,
    isTransientError: boolean,
    isClockSkewError: boolean
}

export type BaseContext = {
    [k: string]: string | number | null
}

export type ResultOrError<Type> = Type | ResponsibleError

export function isError<Type>(item: ResultOrError<Type>): item is ResponsibleError {
    const errorMaybe = item as ResponsibleError;

    return errorMaybe !== undefined && errorMaybe.message !== undefined && errorMaybe.statusCode !== undefined && errorMaybe.name !== undefined &&
        errorMaybe.isRetryable !== undefined && errorMaybe.isClockSkewError !== undefined && errorMaybe.isServiceError !== undefined &&
        errorMaybe.isThrottling !== undefined;
}

export enum ErrorType {
    DynamoDBError = "DynamoDBError",
    RoutingError = "RoutingError",
    UnknownError = "UnknownError",
    ClientRequestError = "ClientRequestError",
    ConnectionError = "ConnectionError",
    ServerError = "ServerError",
    DatabaseError = "DatabaseError"
}