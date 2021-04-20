export interface AuthUser extends CoreUser {
    PasswordHash: string,
}

export interface CoreUser {
    Email: string,
    Context: Object
}

export interface PasswordInfo {
    StoredHash: string,
    HashFunction: string,
    Salt: string
}

export enum HashFunction {
    SHA512 = "SHA512",
}