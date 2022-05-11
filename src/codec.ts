import { DecodingContext, EncodingContext } from "./context";
import { DecodingException, Result } from "./errors";

export function identity<T>(x: T): T { return x; }

export type CodecType<T extends Codec<any>> = T extends Codec<infer C> ? C : never;

/** @deprecated use CodecType */
export type UnwrapCodec<T extends Codec<any>> = CodecType<T>;

export interface LoggingConfiguration {
    enabled: boolean
    always: boolean
    logError: (message: string, garbage: unknown) => void
    logWarning?: (message: string, garbage: unknown) => void
}

export enum ReportUnknownProperties {
    NEVER = 0,
    ON_ENCODE = 1,
    ON_DECODE = 2,
    ALWAYS = ON_ENCODE | ON_DECODE
}

export enum TracingMode {
    NO_TRACING = 0,
    FULL_TRACING = 1
}

export interface ErrorHandlingOptions {
    encodeTracing: TracingMode
    decodeTracing: TracingMode
    reportUnknownProperties: ReportUnknownProperties
    strictPrimitives: boolean

    UNSAFE_leaveInvalidValuesAsIs: boolean
}

export abstract class Codec<T> {
    static defaultErrorHandlingOptions: ErrorHandlingOptions = {
        UNSAFE_leaveInvalidValuesAsIs: false,
        encodeTracing: TracingMode.FULL_TRACING,
        decodeTracing: TracingMode.FULL_TRACING,
        reportUnknownProperties: ReportUnknownProperties.ALWAYS,
        strictPrimitives: true
    }

    static loggingConfiguration: LoggingConfiguration = {
        logError() { /* no output by default */ },
        always: false,
        enabled: true
    };

    abstract name: string

    get acceptsMissingFields(): boolean { return false; }

    abstract $decode(value: unknown, ctx: DecodingContext): T
    abstract $encode(value: T, ctx: EncodingContext): unknown

    encode: (value: T) => unknown = v => { return this.$encode(v, new EncodingContext(Codec.defaultErrorHandlingOptions)); }

    private decodeInFreshContext(value: unknown, errorHandlingOptions: ErrorHandlingOptions): T {
        const runCtx = new DecodingContext(errorHandlingOptions);

        return this.$decode(value, runCtx);
    }

    decodeStrict: (value: unknown) => T = value => {
        return this.decodeInFreshContext(value, {
            ...Codec.defaultErrorHandlingOptions,
            UNSAFE_leaveInvalidValuesAsIs: false
        });
    };

    /** @deprecated */
    _decodeStrictWithoutTracing: (value: unknown) => T = value => {
        return this.decodeInFreshContext(value, {
            ...Codec.defaultErrorHandlingOptions,
            encodeTracing: TracingMode.NO_TRACING,
            decodeTracing: TracingMode.NO_TRACING,
            UNSAFE_leaveInvalidValuesAsIs: false
        });
    };

    tryDecodeStrict = (value: unknown): Result<T> => {
        try {
            return { T: "ok", value: this.decodeInFreshContext(value, {
                ...Codec.defaultErrorHandlingOptions,
                UNSAFE_leaveInvalidValuesAsIs: false
            }) };
        } catch (e) {
            if (e instanceof DecodingException) {
                return {T: "error", exception: e};
            } else {
                return {T: "error", exception: new DecodingException("Unknown exception: " + e, [], [],undefined) };
            }
        }
    };

    /** @deprecated highly unsafe mode - do not use without specific reason */
    decodeLax = (value: unknown): T => this.decodeInFreshContext(value, {
        ...Codec.defaultErrorHandlingOptions,
        UNSAFE_leaveInvalidValuesAsIs: true
    });

    decodeWithDefaults = (value: unknown): T => this.decodeInFreshContext(value, Codec.defaultErrorHandlingOptions);

    // Do not make these `rename` args optional - this is intended
    // It is best to name _every_ type and projection, but we should not to enforce it strictly
    imap<T2>(decode: (v: T, ctx: DecodingContext) => T2, encode: (v: T2) => T, rename: string | undefined): Codec<T2> {
        return new CodecProjection(rename ?? this.name, this, decode, encode);
    }

    refine<T2 extends T>(decode: (v: T, ctx: DecodingContext) => T2, rename: string | undefined): Codec<T2> {
        return new CodecProjection(rename ?? this.name, this, decode, identity);
    }

    get opt(): OptionalCodec<T> {
        return new OptionalCodec(this.name + " | nothing", this);
    }

    get optional(): OptionalCodec<T> {
        return this.opt;
    }

    orElse(value: T, isDefault?: (val: unknown) => boolean): Codec<T> {
        return new OrElseCodec(this.name + " or default", this, () => value, isDefault);
    }

    orElseLazy(lazy: () => T, isDefault?: (val: unknown) => boolean): Codec<T> {
        return new OrElseCodec(this.name + " or default", this, lazy, isDefault);
    }

    get orUndefined(): Codec<T | undefined> {
        return new OptValuesCodec(this.name + " | undefined", this, undefined, undefined);
    }

    get orNull(): Codec<T | null> {
        return new OptValuesCodec(this.name + " | null", this, null, null);
    }

    /** @deprecated use orNull */
    get nullable(): Codec<T | null> {
        return this.orNull;
    }

    get orNullOrUndefined(): Codec<T | undefined | null> {
        return new OptValuesCodec(this.name + " | undefined | null", this, undefined, null);
    }

    static make<T>(
        name: string,
        decode: (v: unknown, ctx: DecodingContext) => T,
        encode: (v: T, ctx: EncodingContext) => unknown,
        suppressContext: boolean = false,
        acceptsMissingFields: boolean = false
    ): Codec<T> {
        return new LambdaCodec<T>(name, decode, encode, suppressContext, acceptsMissingFields);
    }
}

class OptValuesCodec<T, O extends undefined | null> extends Codec<T | O> {
    constructor(
        readonly name: string,
        private readonly base: Codec<T>,
        private readonly o1: O,
        private readonly o2: O
    ) { super(); }

    $decode(value: unknown, ctx: DecodingContext): T | O {
        if (value === this.o1 || value === this.o2) return value as O;
        if (!ctx.isTracingEnabled) return this.base.$decode(value, ctx);

        ctx.unsafeEnter(this.name, undefined);
        try {
            return this.base.$decode(value, ctx);
        } finally {
            ctx.unsafeLeave();
        }
    }

    $encode(value: T | O, ctx: EncodingContext): unknown {
        if (value === this.o1 || value === this.o2) return value;
        if (!ctx.isTracingEnabled) return this.base.$encode(value as T, ctx);

        ctx.unsafeEnter(this.name, undefined);
        try {
            return this.base.$encode(value as T, ctx);
        } finally {
            ctx.unsafeLeave();
        }
    }
}

class OrElseCodec<T> extends Codec<T> {
    private static defaultIsDefault(val: unknown) {
        return val === undefined || val === null;
    }

    constructor(
        readonly name: string,
        private readonly base: Codec<T>,
        private readonly lazy: () => T,
        private readonly isDefault: ((val: unknown) => boolean) = OrElseCodec.defaultIsDefault
    ) { super(); }

    get acceptsMissingFields(): boolean { return true; }

    $decode(value: unknown, ctx: DecodingContext): T {
        ctx.unsafeEnter(this.name, undefined);
        try {
            if (this.isDefault(value)) return this.lazy();

            return this.base.$decode(value, ctx);
        } finally {
            ctx.unsafeLeave();
        }
    }

    $encode(value: T, ctx: EncodingContext): unknown {
        return this.base.$encode(value as T, ctx);
    }
}

export class OptionalCodec<T> extends Codec<T | undefined> {
    constructor(
        readonly name: string,
        private readonly base: Codec<T>
    ) { super(); }

    get acceptsMissingFields(): boolean { return true; }

    $decode(value: unknown, ctx: DecodingContext): T | undefined {
        ctx.unsafeEnter(this.name, undefined);
        try {
            if (value === undefined || value === null) return undefined;

            return this.base.$decode(value, ctx);
        } finally {
            ctx.unsafeLeave();
        }
    }

    $encode(value: T | undefined, ctx: EncodingContext): unknown {
        if (value === undefined) return value;

        return this.base.$encode(value as T, ctx);
    }
}

class LambdaCodec<T> extends Codec<T> {
    constructor(
        readonly name: string,
        private readonly _decode: (v: unknown, ctx: DecodingContext) => T,
        private readonly _encode: (v: T, ctx: EncodingContext) => unknown,
        private readonly suppressContext: boolean,
        private readonly _acceptsMissingFields: boolean
    ) { super(); }

    get acceptsMissingFields(): boolean { return this._acceptsMissingFields; }

    $decode(value: unknown, ctx: DecodingContext): T {
        if (!ctx.isTracingEnabled || this.suppressContext) {
            return this._decode(value, ctx);
        }

        ctx.unsafeEnter(this.name, undefined);
        try {
            return this._decode(value, ctx);
        } finally {
            ctx.unsafeLeave();
        }
    }

    $encode(value: T, ctx: EncodingContext): unknown {
        if (!ctx.isTracingEnabled || this.suppressContext) {
            return this._encode(value, ctx);
        }

        ctx.unsafeEnter(this.name, undefined);
        try {
            return this._encode(value, ctx);
        } finally {
            ctx.unsafeLeave();
        }
    }
}

class CodecProjection<T, T2> extends Codec<T2> {
    constructor(
        readonly name: string,
        private readonly base: Codec<T>,
        private readonly decodeToT2: (v: T, ctx: DecodingContext) => T2,
        private readonly encodeToT: (v: T2, ctx: EncodingContext) => T
    ) { super(); }

    $decode(value: unknown, ctx: DecodingContext): T2 {
        if (!ctx.isTracingEnabled)
            return this.decodeToT2(this.base.$decode(value, ctx), ctx);

        ctx.unsafeEnter(this.name, undefined);
        try {
            return this.decodeToT2(this.base.$decode(value, ctx), ctx);
        } finally {
            ctx.unsafeLeave();
        }
    }

    $encode(value: T2, ctx: EncodingContext): unknown {
        if (!ctx.isTracingEnabled)
            return this.base.$encode(this.encodeToT(value, ctx), ctx);

        ctx.unsafeEnter(this.name, undefined);
        try {
            return this.base.$encode(this.encodeToT(value, ctx), ctx);
        } finally {
            ctx.unsafeLeave();
        }
    }
}