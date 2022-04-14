export class DecodingException {
    static formatError(
        message: string,
        scope: string[],
        path: (string|number|undefined)[]
    ) {
        const pathStr = path.filter(x => x !== undefined).map(x => typeof x === "string" ? x : `[${x}]`).join(".")
        const traceStr = scope.map(x => "\n\tat " + x).reverse().join("");

        return `${message}\nValue path: ${pathStr}\nScope trace:${traceStr}`;
    }

    readonly scope: string[]
    readonly path: (string|number|undefined)[]

    constructor(
        readonly message: string,
        scope: string[],
        path: (string|number|undefined)[],
        readonly garbage: unknown
    ) {
        this.scope = [...scope];
        this.path = [...path];
    }

    toString() {
        return DecodingException.formatError(this.message, this.scope, this.path)
    }
}

export type Result<T> = {
    T: "ok"
    value: T
} | {
    T: "error"
    exception: DecodingException
}