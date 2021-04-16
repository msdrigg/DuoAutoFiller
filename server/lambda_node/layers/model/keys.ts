type FrontendKey = {
    key: string,
    id: string,
    context: Object,
    lastContentUpdate: Date,
    useCounter: number
}

interface KeyContext {
    name: string,
    site: string,
    creationDate: number
}