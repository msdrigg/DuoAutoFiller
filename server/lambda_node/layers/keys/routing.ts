import { IKeyRepository, CoreKey } from ".";
import {
    UserAuthorizationContext,
    LambdaResponse,
    ResultOrError,
    isError,
    getErrorLambdaResponse,
    createResponsibleError,
    ErrorType,
    GenericRouter
} from "../common";

export class KeyRouter implements GenericRouter {
    repository: IKeyRepository;

    constructor(keyRepository: IKeyRepository) {
        this.repository = keyRepository
    }

    async routeRequest(routes: Array<string>, body: string, authorizer: UserAuthorizationContext): Promise<LambdaResponse> {
        // Route users requests 
        let route = "";
        if (routes.length > 0) {
            route = routes[0];
        }

        const userEmailAuthorized = authorizer.userEmail;

        switch (route) {
            case '': {
                // Posting (updating or adding a key
                const frontendKey = JSON.parse(body);
                const response: ResultOrError<CoreKey> = await this.repository.createKey(userEmailAuthorized, frontendKey);
                if (isError(response)) {
                    return getErrorLambdaResponse(response);
                } else {
                    return response;
                }
            }
            case 'findSinceTimestamp': {
                // Find all keys (batch) since a timestamp. If not provided, find all
                const timestamp = JSON.parse(body).timestamp;

                const dateTime = timestamp && Date.parse(timestamp) || timestamp
                
                const response = await this.repository.getKeysSinceTime(userEmailAuthorized, dateTime);
                if (isError(response)) {
                    return getErrorLambdaResponse(response);
                } else {
                    return response as CoreKey[];
                }
            }
            case 'downloadAndUse': {
                // Increment usageCounter and return the key atomically
                const requestBody = JSON.parse(body);
                const keyId = requestBody.id;
                
                const result = await this.repository.getAndIncrement(userEmailAuthorized, keyId);
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
