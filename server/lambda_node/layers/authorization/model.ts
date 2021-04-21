import { UserAuthorizationContext, SessionAuthorizationContext } from "../common";

export type LambdaAuthorization = {
    isAuthorized: boolean,
    context?: UserAuthorizationContext | SessionAuthorizationContext
};
