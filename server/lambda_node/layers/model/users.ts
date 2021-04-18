export interface AuthUser extends CoreUser {
    passwordHash: string,
}

export interface CoreUser {
    email: string,
    context: Object
}

export interface PasswordInfo {
    storedHash: string,
    hashFunction: string,
    salt: string
}

export enum HashFunction {
    SHA512 = "SHA512",
}

export interface UserUpdate {
    email: string,
    context?: Object,
    newEmail?: string,
    passwordHash?: string,
}