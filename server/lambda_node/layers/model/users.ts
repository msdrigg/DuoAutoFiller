export type FrontendUser = {
    email: string,
    passwordHash: string,
    signupDate: Date,
    context: Object
}
export interface PasswordInfo {
    storedHash: string,
    hashFunction: HashFunction,
    salt: string
}

export enum HashFunction {
    SHA512 = "SHA512",
}

export interface UserUpdate {
    context?: Object,
    email?: string,
    passwordHash?: string,
}