import {DecodingException} from "./errors";

export type WarnMode = "batch" | "on-the-go" | "suppress";

export interface DecodingFlags {
    readonly bestEffort: boolean
    readonly warnMode: WarnMode
}

export class DecodingContext {
    scope: string[] = []
    path: (string|number|undefined)[] = ["#"]
    warnings: DecodingException[] = []

    constructor(
        readonly flags: DecodingFlags
    ) { }

    unsafeEnter(scopeName: string, path: string | number | undefined): void {
        this.scope.push(scopeName);
        this.path.push(path);
    }

    unsafeLeave(): void {
        this.scope.pop();
        this.path.pop();
    }

    failure<T>(message: string, garbage: unknown): T {
        if (this.flags.bestEffort) {
            switch (this.flags.warnMode) {
                case "batch": {
                    const dex = new DecodingException(message, [...this.scope].reverse(), [...this.path], garbage);
                    this.warnings.push(dex);
                    break;
                }
                case "on-the-go": {
                    const dex = new DecodingException(message, [...this.scope].reverse(), [...this.path], garbage);
                    dex.print(true);
                    break;
                }
                case "suppress": break;
            }

            return garbage as T;
        }

        throw new DecodingException(message, [...this.scope].reverse(), [...this.path], garbage);
    }

    enclose<T>(scopeName: string, path: string | number | undefined, fn: () => T): T {
        this.unsafeEnter(scopeName, path);

        try {
            return fn();
        } finally {
            this.unsafeLeave();
        }
    }
}