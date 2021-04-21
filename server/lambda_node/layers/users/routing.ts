import { IUserRepository } from ".";
import {
    constants,
    createResponsibleError,
    ErrorType,
    GenericRouter,
    getErrorLambdaResponse,
    isError,
    LambdaResponse,
    UserAuthorizationContext
} from "../common";

export class UserRouter implements GenericRouter {
    repository: IUserRepository;

    constructor(userRepository: IUserRepository) {
        this.repository = userRepository
    }

    async routeRequest(routes: Array<string>, body: string, authorizer: UserAuthorizationContext): Promise<LambdaResponse> {
        let userEmailAuthorized: string;

        if (routes[0] == "signup") {
            userEmailAuthorized = undefined;
        } else {
            userEmailAuthorized = authorizer.userEmail;
        }

        const primaryRoute = routes[0];

        switch (primaryRoute) {
            case 'signup': {
                // Creating a user
                const userSubmission = JSON.parse(body);
                const result = this.repository.createUser(
                    userSubmission.Email,
                    userSubmission.PasswordHash,
                    userSubmission.Context,
                );
                
                if (isError(result)) {
                    return getErrorLambdaResponse(result);
                } else if (result === undefined) {
                    return constants.OK_MODEL;
                } else {
                    return getErrorLambdaResponse(
                        createResponsibleError(ErrorType.DatabaseError, "Error adding user to database with conflict", 409)
                    )
                }
            }
            case 'update': {
                const input = JSON.parse(body);
                const result = await this.repository.updateUser(userEmailAuthorized, input);
                if (isError(result)) {
                    return getErrorLambdaResponse(result);
                } else {
                    return result
                }
            }
            default: {
                return getErrorLambdaResponse(
                    createResponsibleError(ErrorType.ClientRequestError, `Path not found: user/.${routes.join("/")}`, 404)
                );
            }
        }
    }
}