import { BaseContext } from "../common"

export type CoreUser = {
    Email: string,
    Context: BaseContext
}

export type UserAuthVerifier = CoreUser & {
    PasswordInfo: PasswordInfo,
}

export type UserAuthExternal = Omit<CoreUser, "Context"> & {
    PasswordInput: string,
    Context?: BaseContext
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
    PasswordHash?: string,
}