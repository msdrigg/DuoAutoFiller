type FrontendKey = {
    key: string,
    id: string,
    context: KeyContext,
    lastContentUpdate: Date,
    useCounter: number
}

interface KeyContext extends Object {
    name: string,
    site: string,
    creationDate: number
}