import * as joi from "joi";

export const authorizationHeaderStringValidation = 
    joi.string().max(1040).pattern(/^[Bb]asic\s.*$/)

export const emailValidator = joi.string().email()
export const passwordHashValidator = joi.string().max(4096)