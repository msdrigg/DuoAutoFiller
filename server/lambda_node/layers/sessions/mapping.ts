import { CoreSession } from ".";
import { DatabaseSession } from "./repository";

export function getFrontendSession(databaseSession: DatabaseSession): CoreSession {
    return {
        Key: databaseSession.Key,
        Id: databaseSession.SKCombined.slice(2),
        Context: databaseSession.Context,
        Expiration: new Date(databaseSession.Temporal)
    };
}

export function getDatabaseSession(userEmail: string, frontendSession: CoreSession): DatabaseSession {
    return {
        Key: frontendSession.Key,
        PKCombined: userEmail,
        SKCombined: "S#" + frontendSession.Id,
        Context: frontendSession.Context,
        Temporal: frontendSession.Expiration.getTime()
    };
}