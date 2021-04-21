export type LambdaAuthorization = {
    isAuthorized: boolean,
    context?: UserAuthorizationContext | SessionAuthorizationContext
};

export type UserAuthorizationContext = {
    userEmail: string
}

export type SessionAuthorizationContext = UserAuthorizationContext & {
    sessionId: string
}

export function isSessionAuthorizationContext(item: UserAuthorizationContext): item is SessionAuthorizationContext {
    return (item as SessionAuthorizationContext).sessionId !== undefined
}