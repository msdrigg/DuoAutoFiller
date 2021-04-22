import { BaseContext } from "../common"

export type CoreUser = {
    Email: string,
    Context?: BaseContext
}

export type UserAuthVerifier = CoreUser & {
    PasswordInfo: PasswordInfo,
}

export type UserAuthExternal = CoreUser & {
    PasswordInput: string,
}

export type PasswordInfo = {
    StoredHash: string,
    HashFunction: string,
    Salt: string
}

export enum HashFunction {
    SHA512 = "SHA512",
    DEFAULT = SHA512,
}

export type UserUpdate = {
    Context?: BaseContext,
    Email?: string,
    PasswordInput?: string,
}