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

export enum ErrorType {
    DynamoDBError = "DynamoDBError",
    RoutingError = "RoutingError",
    UnknownError = "UnknownError",
    ClientRequestError = "ClientRequestError",
    BodyValidationError = "BodyValidationError",
    DatabaseItemNotFoundError = "DatabaseItemNotFound",
    PathNotFoundError = "PathNotFoundError",
    ConnectionError = "ConnectionError",
    ServerError = "ServerError",
    DatabaseError = "DatabaseError"
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

export function getResponsibleUnknownError(reason?: unknown): ResponsibleError {
    let usableError: Error;
    if (reason !== undefined && (reason as Error).name !== undefined) {
        usableError == reason as Error;
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