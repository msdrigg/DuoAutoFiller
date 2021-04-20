import { BaseContext } from "./common"

export type CoreUser = {
    Email: string,
    Context: BaseContext
}

export type AuthUser = CoreUser & {
    PasswordHash: string,
}

export type PasswordInfo = {
    StoredHash: string,
    HashFunction: string,
    Salt: string
}

export enum HashFunction {
    SHA512 = "SHA512",
}

export type UserUpdate = {
    Context?: { [k: string]: string | number | null }
    Email?: string,
    PasswordHash?: string,
}