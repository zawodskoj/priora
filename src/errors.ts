export class DecodingException {
    constructor(
        readonly message: string,
        readonly scope: string[],
        readonly path: (string|number|undefined)[],
        readonly garbage: unknown
    ) {}

    print(warn: boolean = false) {
        const path = this.path.filter(x => x !== undefined).map(x => typeof x === "string" ? x : `[${x}]`).join(".")
        const trace = this.scope.map(x => "\n\tat " + x).join("");

        if (warn) {
            console.warn(`${this.message}\nValue path: ${path}\nScope trace:${trace}`);
            console.warn("Garbage value:", this.garbage);
        } else {
            console.error(`${this.message}\nValue path: ${path}\nScope trace:${trace}`);
            console.error("Garbage value:", this.garbage);
        }
    }
}

export type Result<T> = {
    T: "ok"
    value: T
} | {
    T: "error"
    exception: DecodingException
}