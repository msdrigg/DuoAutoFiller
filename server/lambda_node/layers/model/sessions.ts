type FrontendSession = {
    Id: string,
    Key: string,
    Context: SessionContext,
    Expiration: Date,
}

interface SessionContext {
    Name: string
}
