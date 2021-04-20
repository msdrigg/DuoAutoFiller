import { KeyContext } from "../../model/keys";
import { PasswordInfo } from "../../model/users";

export interface DatabaseRow {
    PKCombined: string,
    SKCombined: string
}

export interface DatabaseUser extends DatabaseRow {
    PasswordInfo: PasswordInfo,
    Context: any,
    Temporal: number
}

export interface DatabaseKey extends DatabaseRow {
    Context: KeyContext,
    Key: string,
    UseCounter: number,
    Temporal: number,
}

export interface DatabaseSession extends DatabaseRow {
    Key: string,
    Context: SessionContext,
    Temporal: number
}
