import { UserAuthorizationContext } from "./AuthorizationContext";
import { LambdaResponse } from "./AWSLambdaEvents";

export interface GenericRouter {
    routeRequest(pathParts: Array<string>, body: unknown, authorizer: UserAuthorizationContext): Promise<LambdaResponse>
}