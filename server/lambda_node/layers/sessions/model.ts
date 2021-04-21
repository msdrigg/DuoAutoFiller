import { BaseContext } from "../common"

export type CoreSession = {
    Id: string,
    Key: string,
    Context: SessionContext,
    Expiration: Date,
}

export type SessionContext  = {
    Name: string
} & BaseContext
