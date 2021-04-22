import * as joi from "joi";

export const coreUserValidator = joi.object({
    Email: joi.string().email().required(),
    Context: joi.object().optional()
});

export const userAuthExternalValidator = coreUserValidator.keys({
    PasswordHash: joi.string().max(2050).required()
})

export const userUpdateValidator = userAuthExternalValidator.fork(
    ["Email", "Context", "PasswordHash"],
    (schema) => schema.optional()
);