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
import { UserAuthChallenge, UserUpdate } from "./model";

export class UserRouter implements GenericRouter {
    repository: IUserRepository;

    constructor(userRepository: IUserRepository) {
        this.repository = userRepository
    }

    async routeRequest(routes: Array<string>, parsedBody: unknown, authorizer: UserAuthorizationContext): Promise<LambdaResponse> {
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
                const userSubmission = parsedBody as UserAuthChallenge;
                const result = this.repository.createUser(
                    userSubmission.Email,
                    userSubmission.PasswordInput,
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
                const result = await this.repository.updateUser(userEmailAuthorized, parsedBody as UserUpdate);
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