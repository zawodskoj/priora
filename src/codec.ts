import {DecodingContext, DecodingFlags} from "./context";
import {DecodingException, Result} from "./errors";

export function identity<T>(x: T): T { return x; }

export type UnwrapCodec<T extends Codec<any>> = T extends Codec<infer C> ? C : never;

export interface LoggingConfiguration {
    enabled: boolean
    always: boolean
    logError(message: string, garbage: unknown): void
}

export abstract class Codec<T> {
    static defaultStrictMode: boolean = true;
    static loggingConfiguration: LoggingConfiguration = {
        logError(message, garbage) { /* no output by default */ },
        always: false,
        enabled: true
    };

    abstract name: string

    abstract $decode(value: unknown, ctx: DecodingContext): T
    abstract $encode(value: T): unknown

    encode: (value: T) => unknown = v => { return this.$encode(v); }

    private decodeInFreshContext(value: unknown, flags: DecodingFlags): T {
        const runCtx = new DecodingContext(flags);

        return this.$decode(value, runCtx);
    }

    decodeStrict: (value: unknown) => T = value => {
        return this.decodeInFreshContext(value, { bestEffort: false });
    };

    tryDecodeStrict = (value: unknown): Result<T> => {
        try {
            return { T: "ok", value: this.decodeInFreshContext(value, { bestEffort: false }) };
        } catch (e) {
            if (e instanceof DecodingException) {
                return {T: "error", exception: e};
            } else {
                return {T: "error", exception: new DecodingException("Unknown exception: " + e, [], [],undefined) };
            }
        }
    };

    decodeLax = (value: unknown): T => this.decodeInFreshContext(value, {
        bestEffort: true
    });

    decodeWithDefaults = (value: unknown): T => this.decodeInFreshContext(value, {
        bestEffort: !Codec.defaultStrictMode
    });

    // Do not make these `rename` args optional - this is intended
    // It is best to name _every_ type and projection, but we should not to enforce it strictly
    imap<T2>(decode: (v: T, ctx: DecodingContext) => T2, encode: (v: T2) => T, rename: string | undefined): Codec<T2> {
        return new CodecProjection(rename ?? this.name, this, decode, encode);
    }

    refine<T2 extends T>(decode: (v: T, ctx: DecodingContext) => T2, rename: string | undefined): Codec<T2> {
        return new CodecProjection(rename ?? this.name, this, decode, identity);
    }

    get optional(): Codec<T | undefined> {
        return new OptionalCodec(this.name + " | nothing", this, undefined, null)
            .imap<T | undefined>(x => x ?? undefined, x => x, undefined);
    }

    get optionalStrict(): Codec<T | undefined | null> {
        return new OptionalCodec(this.name + " | undefined | null", this, undefined, null);
    }

    get transient(): Codec<T | undefined> {
        return new OptionalCodec(this.name + " | undefined", this, undefined, undefined);
    }

    get nullable(): Codec<T | null> {
        return new OptionalCodec(this.name + " | null", this, null, null);
    }

    static make<T>(name: string, decode: (v: unknown, ctx: DecodingContext) => T, encode: (v: T) => unknown, suppressContext: boolean = false): Codec<T> {
        return new LambdaCodec<T>(name, decode, encode, suppressContext);
    }
}

class OptionalCodec<T, O extends undefined | null> extends Codec<T | O> {
    constructor(
        readonly name: string,
        private readonly base: Codec<T>,
        private readonly o1: O,
        private readonly o2: O
    ) { super(); }

    $decode(value: unknown, ctx: DecodingContext): T | O {
        ctx.unsafeEnter(this.name, undefined);
        try {
            if (value === this.o1 || value === this.o2) return value as O;

            return this.base.$decode(value, ctx);
        } finally {
            ctx.unsafeLeave();
        }
    }

    $encode(value: T | O): unknown {
        if (value === this.o1 || value === this.o2) return value;

        return this.base.$encode(value as T);
    }
}

class LambdaCodec<T> extends Codec<T> {
    constructor(
        readonly name: string,
        private readonly _decode: (v: unknown, ctx: DecodingContext) => T,
        private readonly _encode: (v: T) => unknown,
        private readonly suppressContext: boolean
    ) { super(); }

    $decode(value: unknown, ctx: DecodingContext): T {
        if (this.suppressContext) {
            return this._decode(value, ctx);
        }

        ctx.unsafeEnter(this.name, undefined);
        try {
            return this._decode(value, ctx);
        } finally {
            ctx.unsafeLeave();
        }
    }

    $encode(value: T): unknown {
        return this._encode(value);
    }
}

class CodecProjection<T, T2> extends Codec<T2> {
    constructor(
        readonly name: string,
        private readonly base: Codec<T>,
        private readonly decodeToT2: (v: T, ctx: DecodingContext) => T2,
        private readonly encodeToT: (v: T2) => T
    ) { super(); }

    $decode(value: unknown, ctx: DecodingContext): T2 {
        ctx.unsafeEnter(this.name, undefined);
        try {
            return this.decodeToT2(this.base.$decode(value, ctx), ctx);
        } finally {
            ctx.unsafeLeave();
        }
    }

    $encode(value: T2): unknown {
        return this.base.$encode(this.encodeToT(value));
    }
}