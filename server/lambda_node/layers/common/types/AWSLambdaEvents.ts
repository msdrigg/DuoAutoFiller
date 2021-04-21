import { UserAuthorizationContext } from "./AuthorizationContext";
import { ResponsibleError } from "./ResponsibleError";

export type LambdaContext = {
    authorizer: UserAuthorizationContext
}

export type APIGatewayRequestEvent = {
    rawPath: string,
    body: string,
    cookies: Array<string>,
    headers: {[k: string]: string}
}
type Serializable = null | boolean | number | string | Date | Error | Serializable[] | { [k: string]: Serializable }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LambdaResponse =  {
    isBase64Encoded?: boolean,
    statusCode: number,
    body: string,
    headers?: { [k: string]: string }
    cookies?: Array<string>
} | (
    Serializable & {statusCode?: never}
)

export function getErrorLambdaResponse(error: ResponsibleError): LambdaResponse {
    return {
        statusCode: error.statusCode,
        body: JSON.stringify(error),
        headers: {
            "content-type": "application/json"
        }
    }
}