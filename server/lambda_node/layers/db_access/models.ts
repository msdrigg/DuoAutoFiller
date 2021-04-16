interface DatabaseRow {
    PKCombined: string,
    SKCombined: string
}

interface DatabaseUser extends DatabaseRow {
    passwordInfo: PasswordInfo,
    context: Object,
    temporal: number
}

interface DatabaseKey extends DatabaseRow {
    context: KeyContext,
    useCounter: number,
    temporal: number,
}

interface DatabaseSession extends DatabaseRow {
    key: string,
    context: SessionContext,
    temporal: number
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
