import { ResponsibleError } from "./ResponsibleError";

export type ResultOrError<Type> = Type | ResponsibleError

export function isError<Type>(item: ResultOrError<Type>): item is ResponsibleError {
    const errorMaybe = item as ResponsibleError;

    return errorMaybe !== undefined && errorMaybe.message !== undefined && errorMaybe.statusCode !== undefined && errorMaybe.name !== undefined &&
        errorMaybe.isRetryable !== undefined && errorMaybe.isClockSkewError !== undefined && errorMaybe.isServiceError !== undefined &&
        errorMaybe.isThrottling !== undefined;
}
