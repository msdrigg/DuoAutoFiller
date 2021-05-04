import { IKeyRepository, CoreKey } from ".";
import {
    UserAuthorizationContext,
    LambdaResponse,
    isError,
    getErrorLambdaResponse,
    createResponsibleError,
    ErrorType,
    GenericRouter
} from "../common";
import { CreationKey } from "./model";
import { idValidation, keyCreationValidation, timestampValidation } from "./validation";

export class KeyRouter implements GenericRouter {
    repository: IKeyRepository;

    constructor(keyRepository: IKeyRepository) {
        this.repository = keyRepository
    }

    async routeRequest(routes: Array<string>, parsedBody: unknown, authorizer: UserAuthorizationContext): Promise<LambdaResponse> {
        // Route users requests 
        let route = "";
        if (routes.length > 0) {
            route = routes[0];
        }

        const userEmailAuthorized = authorizer.userEmail;

        switch (route) {
            case '': {
                // Posting (updating or adding) a key
                const { error, value } = keyCreationValidation.validate(parsedBody)
                if (error !== undefined) {
                    return getErrorLambdaResponse(
                        createResponsibleError(
                            ErrorType.BodyValidationError,
                            `Body validation error: ${error.message}`,
                            400,
                            error
                        )
                    )
                }
                const response = await this.repository.createKey(userEmailAuthorized, value as CreationKey);
                if (isError(response)) {
                    return getErrorLambdaResponse(response);
                } else {
                    return response;
                }
            }
            case 'findSinceTimestamp': {
                // Find all keys (batch) since a timestamp. If not provided, find all
                const { error, value } = timestampValidation.validate(parsedBody)

                if (error !== undefined) {
                    return getErrorLambdaResponse(
                        createResponsibleError(
                            ErrorType.BodyValidationError,
                            `Body validation error: ${error.message}`,
                            400,
                            error
                        )
                    )
                }
                const timestamp = value.timestamp as string;
                const dateTime = timestamp ? new Date(Date.parse(timestamp)) : undefined;
                
                const response = await this.repository.getKeysSinceTime(userEmailAuthorized, dateTime);
                if (isError(response)) {
                    return getErrorLambdaResponse(response);
                } else {
                    return response as CoreKey[];
                }
            }
            case 'downloadAndUse': {
                // Increment usageCounter and return the key atomically

                const { error, value } = idValidation.validate(parsedBody)

                if (error !== undefined) {
                    return getErrorLambdaResponse(
                        createResponsibleError(
                            ErrorType.BodyValidationError,
                            `Body validation error: ${error.message}`,
                            400,
                            error
                        )
                    )
                }
                
                const result = await this.repository.getAndIncrement(userEmailAuthorized, value.Id as string );
                if (isError(result)) {
                    return getErrorLambdaResponse(result);
                } else {
                    return result;
                }
            }
            default: {
                return getErrorLambdaResponse(
                    createResponsibleError(ErrorType.ClientRequestError, `Path not found: key/${routes.join("/")}`, 404)
                );
            }
        }
    }
}
