import * as joi from "joi";

export const keyCreationValidation = joi.object({
    Key: joi.string().options({presence: "required"}),
    Context: joi.any()
})

export const timestampValidation = joi.object({
    timestamp: joi.string().pattern(/^(?:[1-9]\d{3}-(?:(?:0[1-9]|1[0-2])-(?:0[1-9]|1\d|2[0-8])|(?:0[13-9]|1[0-2])-(?:29|30)|(?:0[13578]|1[02])-31)|(?:[1-9]\d(?:0[48]|[2468][048]|[13579][26])|(?:[2468][048]|[13579][26])00)-02-29)T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:Z|[+-][01]\d:[0-5]\d)$/)
}).options({
    presence: "required"
})

export const idValidation = joi.object({
    Id: joi.string()
}).options({
    presence: "required"
})