import { UserAuthorizationContext } from "./AuthorizationContext";
import { LambdaResponse } from "./AWSLambdaEvents";
import { ResultOrError } from "./ResultOrError";

export interface GenericRouter {
    routeRequest(pathParts: Array<string>, body: string, authorizer: UserAuthorizationContext): Promise<ResultOrError<LambdaResponse>>
}