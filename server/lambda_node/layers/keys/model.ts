import { BaseContext } from "../common"

export type CoreKey = {
    Key: string,
    Id: string,
    Context: KeyContext,
    LastContentUpdate: Date,
    UseCounter: number
}

export type KeyContext = {
    Name: string,
    Site: string,
    CreationDate: number
} & BaseContext

export type CreationKey = {
    Key: string,
    Context: KeyContext,
    UseCounter?: number,
}