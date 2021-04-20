export type LambdaAuthorization = {
    isAuthorized: boolean,
    context?: AuthorizationContext
};

export type AuthorizationContext = {
    userEmail: string
}

export type SessionAuthorizationContext = AuthorizationContext & {
    sessionId: string
}

export function isSessionAuthorizationContext(item: AuthorizationContext): item is SessionAuthorizationContext {
    return (item as SessionAuthorizationContext).sessionId !== undefined
}