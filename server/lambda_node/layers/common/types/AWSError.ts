import { ErrorType, ResponsibleError } from "./ResponsibleError";
import * as serviceErrorClassification from "@aws-sdk/service-error-classification";

export type AWSError = Error & {
    $fault: "client" | "server",
    $retryable?: {
        throttling?: boolean
    }
    $service?: string,
    name: string,
    $metadata: AWSErrorMetadata
}

type AWSErrorMetadata = {
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

export function getResponsibleError(error: AWSError): ResponsibleError {
    // Handle AWS Error
    let name: ErrorType;
    if (error.$fault == "server") {
        name = ErrorType.DynamoDBError
    } else {
        name = ErrorType.ServerError
    }
    return {
        name: name,
        message: error.message,
        reason: error,
        statusCode: error.$metadata?.httpStatusCode || 500,
        isRetryable: serviceErrorClassification.isRetryableByTrait(error),
        isThrottling: serviceErrorClassification.isThrottlingError(error),
        isServiceError: error.$fault == "server" || error.$service !== undefined,
        isTransientError: serviceErrorClassification.isTransientError(error),
        isClockSkewError: serviceErrorClassification.isClockSkewError(error)
    }
}
