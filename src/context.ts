import { DecodingException } from "./errors";
import { Codec } from "./codec";

export interface DecodingFlags {
    readonly bestEffort: boolean
}

export class DecodingContext {
    scope: string[] = []
    path: (string|number|undefined)[] = ["#"]

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
        const logCfg = Codec.loggingConfiguration;

        if (logCfg.enabled && (logCfg.always || this.flags.bestEffort)) {
            logCfg.logError(
                DecodingException.formatError(message, this.scope, this.path),
                garbage
            )
        }

        if (this.flags.bestEffort)
            return garbage as T;

        throw new DecodingException(message, this.scope, this.path, garbage);
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