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

export class SessionRouter implements GenericRouter {
    repository: ISessionRepository;

    constructor(sessionRepository: ISessionRepository) {
        this.repository = sessionRepository
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
            case 'refreshSession': {
                // Download the session key
                let result: ResultOrError<CoreSession>;
                if (isSessionAuthorizationContext(authorizer)) {
                    result = await this.repository.getSession(userEmailAuthorized, authorizer.sessionId);
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
                const request = JSON.parse(body);

                let sessionCookies: Array<string>;
                let sessionName: string;
                const sessionId = httpUtils.getRandomString(32);
                let expirationDate: Date;

                if (request.sessionLength == 0) {
                    // Use browser session. Validate for 30 days
                    const expirationTimeout = constants.MAX_SESSION_LENGTH_SECONDS;
                    const expirationSeconds = Math.floor(
                        (new Date()).getTime() / 1000 + expirationTimeout
                    );
                    expirationDate = new Date(expirationSeconds);

                    sessionCookies = [
                        httpUtils.getCookieString(constants.SESSION_COOKIE_NAME, sessionId, expirationDate),
                        httpUtils.getCookieString(constants.EMAIL_COOKIE_NAME, userEmailAuthorized, expirationDate)
                    ];
                    sessionName = "TEMPORARY";

                } else {
                    const expirationTimeoutSeconds = Math.min(
                        constants.MAX_SESSION_LENGTH_SECONDS, 
                        request.sessionLength
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
                            userEmailAuthorized,
                            expirationDate
                        )
                    ];
                    sessionName = request.sessionName;
                }

                await this.repository.createSession(
                    userEmailAuthorized,
                    sessionId,
                    sessionName,
                    expirationDate,
                )

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