import { DecodingException } from "./errors";
import { Codec, ErrorHandlingOptions, TracingMode } from "./codec";

class TranscodingContext {
    isTracingEnabled: boolean = false;

    scope: string[] = []
    path: (string|number|undefined)[] = ["#"]

    constructor(
        readonly errorHandlingOptions: ErrorHandlingOptions,
        readonly tracingMode: TracingMode
    ) {
        this.isTracingEnabled = this.tracingMode !== TracingMode.NO_TRACING;
    }

    unsafeEnter(scopeName: string, path: string | number | undefined): void {
        if (this.tracingMode === TracingMode.NO_TRACING) return;

        this.scope.push(scopeName);
        this.path.push(path);
    }

    unsafeLeave(): void {
        if (this.tracingMode === TracingMode.NO_TRACING) return;

        this.scope.pop();
        this.path.pop();
    }

    failure<T>(message: string, garbage: unknown): T {
        const logCfg = Codec.loggingConfiguration;

        if (logCfg.enabled && (logCfg.always || this.errorHandlingOptions.UNSAFE_leaveInvalidValuesAsIs)) {
            logCfg.logError(
                DecodingException.formatError(message, this.scope, this.path),
                garbage
            )
        }

        if (this.errorHandlingOptions.UNSAFE_leaveInvalidValuesAsIs)
            return garbage as T;

        throw new DecodingException(message, this.scope, this.path, garbage);
    }

    warn<T>(message: string, garbage: unknown): void {
        const logCfg = Codec.loggingConfiguration;

        if (logCfg.enabled) {
            (logCfg.logWarning ?? logCfg.logError)(
                DecodingException.formatError(message, this.scope, this.path),
                garbage
            )
        }
    }

    enclose<T>(scopeName: string, path: string | number | undefined, fn: () => T): T {
        if (this.tracingMode === TracingMode.NO_TRACING) return fn();

        this.unsafeEnter(scopeName, path);

        try {
            return fn();
        } finally {
            this.unsafeLeave();
        }
    }
}

export class DecodingContext extends TranscodingContext {
    constructor(errorHandlingOptions: ErrorHandlingOptions) {
        super(errorHandlingOptions, errorHandlingOptions.decodeTracing);
    }
}

export class EncodingContext extends TranscodingContext {
    constructor(errorHandlingOptions: ErrorHandlingOptions) {
        super(errorHandlingOptions, errorHandlingOptions.encodeTracing);
    }
}