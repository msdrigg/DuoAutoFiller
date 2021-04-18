export type ErrorResponse = {
    message: string,
    statusCode: number,
    reason?: any
}

export type ResultOrError<Type> = Type | ErrorResponse