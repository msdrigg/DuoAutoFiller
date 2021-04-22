import * as joi from "joi";

export const sessionCreationValidation = joi.object({
    Length: joi.number().optional(),
    Name: joi.string().max(500).required(),
})