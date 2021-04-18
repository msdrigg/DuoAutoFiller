export type LambdaResponse = string | {
    isBase64Encoded?: boolean,
    statusCode: number,
    body: string,
    headers?: Object
    cookies?: Array<String>
} | Object;