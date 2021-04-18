export type LambdaAuthorization = {
    isAuthorized: boolean,
    context: AuthorizationContext
};

export type AuthorizationContext = {
    userEmail: string | null
};