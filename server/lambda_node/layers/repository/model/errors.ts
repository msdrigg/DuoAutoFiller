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

export function isAWSError(item?: unknown): item is AWSError {
    const errorMaybe = item as AWSError;
    return errorMaybe !== undefined && errorMaybe.name !== undefined && errorMaybe.$metadata !== undefined && (errorMaybe.$fault == "client" || errorMaybe.$fault == "server")
}