import * as joi from "joi";
export const keyCreationValidation = joi.object({
    Key: joi.string(),
    Context: joi.any()
})

export const timestampValidation = joi.object({
    timestamp: joi.string()
})

export const idValidation = joi.object({
    Id: joi.string()
})