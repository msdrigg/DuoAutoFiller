import { ISessionRepository, CoreSession } from ".";
import {
    UserAuthorizationContext,
    LambdaResponse,
    ResultOrError,
    isSessionAuthorizationContext,
    createResponsibleError,
    ErrorType,
    isError,
    getErrorLambdaResponse,
    httpUtils,
    constants,
    GenericRouter
} from "../common";
import { SessionCreation } from "./model";
import { sessionCreationValidation } from "./validation";

export class SessionRouter implements GenericRouter {
    repository: ISessionRepository;

    constructor(sessionRepository: ISessionRepository) {
        this.repository = sessionRepository
    }

    async routeRequest(routes: Array<string>, parsedBody: unknown, authorizer: UserAuthorizationContext): Promise<LambdaResponse> {
        const primaryRoute = routes[0];

        switch (primaryRoute) {
            case 'refreshSession': {
                // Download the session key
                let result: ResultOrError<CoreSession>;
                if (isSessionAuthorizationContext(authorizer)) {
                    result = await this.repository.getSession(authorizer.userEmail, authorizer.sessionId);
                    if (isError(result) && result.isRetryable) {
                        result = await this.repository.getSession(authorizer.userEmail, authorizer.sessionId);
                    }
                } else {
                    result = createResponsibleError(ErrorType.ServerError, "No session provided in session authorizer", 500)
                }
                if (isError(result)) {
                    return getErrorLambdaResponse(result);
                } else {
                    return result;
                }
            }
            case 'login': {
                // Create a session
                // Return session key in set-cookie header.
                // Return email in set-cookie header
                // Login should include a session length in seconds and session name
                // If session sends 0 for session length,
                //     do a session cookie but still validate it for 30 days
                let sessionCookies: Array<string>;
                let sessionName: string;
                const sessionId = httpUtils.getRandomString(32);
                let expirationDate: Date;
                const { error, value } = sessionCreationValidation.validate(parsedBody);
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
                const request = value as SessionCreation;

                if (request.Length == 0) {
                    // Use browser session. Validate for 30 days
                    const expirationTimeout = constants.MAX_SESSION_LENGTH_SECONDS;
                    const expirationSeconds = Math.floor(
                        (new Date()).getTime() / 1000 + expirationTimeout
                    );
                    expirationDate = new Date(expirationSeconds);

                    sessionCookies = [
                        httpUtils.getCookieString(constants.SESSION_COOKIE_NAME, sessionId, expirationDate),
                        httpUtils.getCookieString(constants.EMAIL_COOKIE_NAME, authorizer.userEmail, expirationDate)
                    ];
                    sessionName = "TEMPORARY";

                } else {
                    const expirationTimeoutSeconds = Math.min(
                        constants.MAX_SESSION_LENGTH_SECONDS, 
                        request.Length
                    );
                    const expirationSeconds = Math.floor(
                        (new Date()).getTime() / 1000 + expirationTimeoutSeconds
                    );
                    expirationDate = new Date(expirationSeconds);

                    sessionCookies = [
                        httpUtils.getCookieString(
                            constants.SESSION_COOKIE_NAME, 
                            sessionId, 
                            expirationDate
                        ),
                        httpUtils.getCookieString(
                            constants.EMAIL_COOKIE_NAME,
                            authorizer.userEmail,
                            expirationDate
                        )
                    ];
                    sessionName = request.Name;
                }

                let result = await this.repository.createSession(
                    authorizer.userEmail,
                    sessionId,
                    sessionName,
                    expirationDate,
                )
                if (isError(result) && result.isRetryable) {
                    result = await this.repository.createSession(
                        authorizer.userEmail,
                        sessionId,
                        sessionName,
                        expirationDate,
                    )
                }
                if (isError(result)){
                    return getErrorLambdaResponse(result);
                }

                return {
                    cookies: sessionCookies,
                    statusCode: 200,
                    body: JSON.stringify(constants.OK_MODEL, null, 2)
                }
            }
            default: {
                return getErrorLambdaResponse(
                    createResponsibleError(ErrorType.ClientRequestError, `Path not found: session/${routes.join("/")}`, 404)
                );
            }
        }
    }
}