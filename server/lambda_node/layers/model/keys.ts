export type FrontendKey = {
    Key: string,
    Id: string,
    Context: KeyContext,
    LastContentUpdate: Date,
    UseCounter: number
}

export type KeyContext = {
    Name: string,
    Site: string,
    CreationDate: number
} & {
    [k: string]: any
}