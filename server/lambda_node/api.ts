import { DynamoDBClientConfig, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { APIGatewayRequestEvent, createResponsibleError, ErrorType, GenericRouter, getErrorLambdaResponse, LambdaContext, LambdaResponse, UserAuthorizationContext } from "./layers/common";
import { KeyRepository, KeyRouter } from "./layers/keys";
import { SessionRepository, SessionRouter } from "./layers/sessions";
import { UserRepository, UserRouter } from "./layers/users";


export class PrimaryRouter implements GenericRouter {
    userRouter: GenericRouter;
    keyRouter: GenericRouter;
    sessionRouter: GenericRouter;

    constructor(userRouter: GenericRouter, keyRouter: GenericRouter, sessionRouter: GenericRouter) {
        this.userRouter = userRouter;
        this.keyRouter = keyRouter;
        this.sessionRouter = sessionRouter;
    }

    async routeRequest(
        pathParts: Array<string>,
        parsedBody: unknown,
        authorizer: UserAuthorizationContext,
    ): Promise<LambdaResponse> {
        const primaryRoute = pathParts[0];
        const remainingPathParts = pathParts.slice(1);
        switch (primaryRoute) {
            case 'key':
                return await this.keyRouter.routeRequest(remainingPathParts, parsedBody, authorizer);

            case 'user':
                return await this.userRouter.routeRequest(remainingPathParts, parsedBody, authorizer);

            case 'session':
                return await this.sessionRouter.routeRequest(remainingPathParts, parsedBody, authorizer);

            default:
                return getErrorLambdaResponse(
                    createResponsibleError(
                        ErrorType.PathNotFoundError,
                        `Path not found: ${pathParts.join('/')}`,
                        404
                    )
                )
        }
    }
}

/**
 * Demonstrates a simple HTTP endpoint using API Gateway. You have full
 * access to the request and response payload, including headers and
 * status code.
 *
 * To scan a DynamoDB table, make a GET request with the TableName as a
 * query string parameter. To put, update, or delete an item, make a POST,
 * PUT, or DELETE request respectively, passing in the payload to the
 * DynamoDB API as a JSON body.
 */
export async function parseRequest(
    rawPath: string,
    body: string,
    authorizer: UserAuthorizationContext,
    primaryRouter: GenericRouter
): Promise<LambdaResponse> {
    const pathParts = rawPath.split('/').slice(1);

    let parsedBody: unknown;
    try {
        parsedBody = JSON.parse(body);
    } catch (err) {
        return getErrorLambdaResponse(createResponsibleError(
            ErrorType.ClientRequestError,
            `Error parsing JSON body: \n${body}`,
            400,
            err
        ))
    }

    return await primaryRouter.routeRequest(
        pathParts,
        parsedBody,
        authorizer
    )
}


const config: DynamoDBClientConfig = {
    region: "us-east-1",
    endpoint: "http://localhost:8000",
    credentials: {
      accessKeyId: "xxxxxx",
      secretAccessKey: "xxxxxx"
    }
}
const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient(config));
const primaryRouter = new PrimaryRouter(
    new UserRouter(new UserRepository(dynamo)),
    new KeyRouter(new KeyRepository(dynamo)),
    new SessionRouter(new SessionRepository(dynamo))
)

exports.handler = async (event: APIGatewayRequestEvent, context: LambdaContext): Promise<LambdaResponse> => {
    return parseRequest(event.rawPath, event.body, context.authorizer, primaryRouter);
};
 