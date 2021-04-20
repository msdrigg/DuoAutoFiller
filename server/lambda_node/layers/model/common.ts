export type ErrorResponse = {
    message: string,
    statusCode: number,
    reason?: any
}

export type ResponsibleError = {
    name: string,
    reason: any,
    message: string,
    requestId?: string,
    statusCode: number,
    isRetryable: boolean,
    isThrottling: boolean,
    isServiceError: boolean,
    isTransientError: boolean,
    isClockSkewError: boolean
}

export type ResultOrError<Type> = Type | ErrorResponse

export function isError<Type>(item: ResultOrError<Type>): item is ErrorResponse {
    let errorMaybe = item as ErrorResponse;
    return errorMaybe.message !== undefined && errorMaybe.statusCode !== undefined;
}
