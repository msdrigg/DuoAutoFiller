export type AWSError = Error & {
    $fault: "client" | "server",
    $retryable?: {
        throttling?: boolean
    }
    $service?: string,
    name: string,
    $metadata: AWSErrorMetadata
}

export type AWSErrorMetadata = {
    requestId?: string,
    cfId?: string,
    extendedRequestId?: string
    attempts?: number,
    totalRetryDelay?: number,
    httpStatusCode?: number
}

export function isAWSError(item: any): item is AWSError {
    let errorMaybe = item as AWSError;
    return errorMaybe.name !== undefined && errorMaybe.$metadata !== undefined && (errorMaybe.$fault == "client" || errorMaybe.$fault == "server")
}