import { DecodingContext } from "./context";

export abstract class KeyCodec<T> {
    abstract name: string

    abstract decode(value: string, ctx: DecodingContext): T
    abstract encode(value: T): string

    // Do not make these `rename` args optional - this is intended
    // It is best to name _every_ type and projection, but we should not to enforce it strictly
    imap<T2>(decode: (v: T, ctx: DecodingContext) => T2, encode: (v: T2) => T, rename: string | undefined): KeyCodec<T2> {
        return new KeyCodecProjection(rename ?? this.name, this, decode, encode);
    }

    static make<T>(name: string, decode: (v: string, ctx: DecodingContext) => T, encode: (v: T) => string): KeyCodec<T> {
        return new LambdaKeyCodec<T>(name,  decode, encode);
    }
}

class LambdaKeyCodec<T> extends KeyCodec<T> {
    constructor(
        readonly name: string,
        private readonly _decode: (v: string, ctx: DecodingContext) => T,
        private readonly _encode: (v: T) => string
    ) { super(); }

    decode(value: string, ctx: DecodingContext): T {
        return this._decode(value, ctx);
    }

    encode(value: T): string {
        return this._encode(value);
    }
}

class KeyCodecProjection<T, T2> extends KeyCodec<T2> {
    constructor(
        readonly name: string,
        private readonly base: KeyCodec<T>,
        private readonly decodeToT2: (v: T, ctx: DecodingContext) => T2,
        private readonly encodeToT: (v: T2) => T
    ) { super(); }

    decode(value: string, ctx: DecodingContext): T2 {
        return this.decodeToT2(this.base.decode(value, ctx), ctx);
    }

    encode(value: T2): string {
        return this.base.encode(this.encodeToT(value));
    }
}