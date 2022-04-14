export class DecodingException {
    constructor(
        readonly message: string,
        readonly scope: string[],
        readonly path: (string|number|undefined)[],
        readonly garbage: unknown
    ) {}

    toString() {
        const path = this.path.filter(x => x !== undefined).map(x => typeof x === "string" ? x : `[${x}]`).join(".")
        const trace = this.scope.map(x => "\n\tat " + x).join("");

        return `${this.message}\nValue path: ${path}\nScope trace:${trace}`;
    }

    print(warn: boolean = false) {
        if (warn) {
            console.warn(this.toString());
            console.warn("Garbage value:", this.garbage);
        } else {
            console.error(this.toString());
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