export type ErrorResponse = {
    message: string,
    statusCode: number,
    reason?: any
}

export type AWSError = Error & {
    $fault: any
    $retryable: any
    name: string
    $metadata: Object
}

export type ResultOrError<Type> = Type | ErrorResponse

export function isError<Type>(item: ResultOrError<Type>): item is ErrorResponse {
    let errorMaybe = item as ErrorResponse;
    return errorMaybe.message !== undefined && errorMaybe.statusCode !== undefined;
}
