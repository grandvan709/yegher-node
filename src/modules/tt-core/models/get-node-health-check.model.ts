export class GetNodeHealthCheckResponseModel {
    public isAlive: boolean;
    public ttInternalStatusCached: boolean;
    public ttVersion: null | string;
    public nodeVersion: string;
    constructor(
        isAlive: boolean,
        ttInternalStatusCached: boolean,
        ttVersion: null | string,
        nodeVersion: string,
    ) {
        this.isAlive = isAlive;
        this.ttInternalStatusCached = ttInternalStatusCached;
        this.ttVersion = ttVersion;
        this.nodeVersion = nodeVersion;
    }
}
