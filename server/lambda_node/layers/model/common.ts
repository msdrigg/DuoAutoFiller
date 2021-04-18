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