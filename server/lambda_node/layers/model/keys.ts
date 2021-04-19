export type FrontendKey = {
    key: string,
    id: string,
    context: KeyContext,
    lastContentUpdate: Date,
    useCounter: number
}

export type KeyContext = {
    Name: string,
    Site: string,
    CreationDate: number
} & {
    [k: string]: any
}