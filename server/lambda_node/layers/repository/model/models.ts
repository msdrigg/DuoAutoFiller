import { KeyContext } from "../../model/keys";
import { SessionContext } from "../../model/sessions";
import { PasswordInfo } from "../../model/users";

export type DatabaseRow = {
    PKCombined: string,
    SKCombined: string
}

export type DatabaseUser = DatabaseRow & {
    PasswordInfo: PasswordInfo,
    Context: {[k: string]: string | number | null},
    Temporal: number
}

export type DatabaseKey = DatabaseRow & {
    Context: KeyContext,
    Key: string,
    UseCounter: number,
    Temporal: number,
}

export type DatabaseSession = DatabaseRow & {
    Key: string,
    Context: SessionContext,
    Temporal: number
}
