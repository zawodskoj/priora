import { Codec } from "../codec";
import { DecodingContext, EncodingContext } from "../context";

export namespace ArrayCodecImpl {
    export function create<T>(typename: string, codec: Codec<T>): Codec<T[]> {
        function decode(val: unknown, ctx: DecodingContext): T[] {
            if (!Array.isArray(val))
                return ctx.failure("Failed to decode array - array expected", val);

            const coercedArray = val as unknown[];
            const target = [] as T[];

            if (ctx.isTracingEnabled) {
                for (let i = 0; i < coercedArray.length; i++){
                    ctx.unsafeEnter(`${typename}[${i}]`, i);

                    try {
                        target.push(codec.$decode(coercedArray[i], ctx));
                    } finally {
                        ctx.unsafeLeave();
                    }
                }
            } else {
                for (let i = 0; i < coercedArray.length; i++) {
                    target.push(codec.$decode(coercedArray[i], ctx));
                }
            }

            return target;
        }

        function encode(val: T[], ctx: EncodingContext): unknown {
            const target = [] as unknown[];

            if (ctx.isTracingEnabled) {
                for (let i = 0; i < val.length; i++){
                    const elem = val[i];

                    ctx.unsafeEnter(`${typename}[${i}]`, i);

                    try {
                        target.push(codec.$encode(elem, ctx));
                    } finally {
                        ctx.unsafeLeave();
                    }
                }
            } else {
                for (let i = 0; i < val.length; i++) {
                    target.push(codec.$encode(val[i], ctx));
                }
            }

            return target;
        }

        return Codec.make(typename, decode, encode);
    }

    export type TupleCodecs<T extends [any, ...any[]]> = {
        [key in keyof T]: Codec<T[key]>
    }

    export function createTuple<T extends [any, ...any[]]>(typename: string, codecs: TupleCodecs<T>): Codec<T> {
        function decode(val: unknown, ctx: DecodingContext): T {
            if (!Array.isArray(val))
                return ctx.failure("Failed to decode tuple - array expected", val);

            if (val.length !== codecs.length)
                return ctx.failure("Failed to decode tuple - wrong element count", val);

            const coercedArray = val as unknown[];
            const target = [] as unknown as T;

            if (ctx.isTracingEnabled) {
                for (let i = 0; i < codecs.length; i++){
                    const elem = coercedArray[i];
                    const codec = codecs[i];

                    ctx.unsafeEnter(`${typename}[${i}]`, i);

                    try {
                        target.push(codec.$decode(elem, ctx));
                    } finally {
                        ctx.unsafeLeave();
                    }
                }
            } else {
                for (let i = 0; i < codecs.length; i++) {
                    const elem = coercedArray[i];
                    const codec = codecs[i];

                    target.push(codec.$decode(elem, ctx));
                }
            }

            return target;
        }

        function encode(val: T, ctx: EncodingContext): unknown {
            const target = [] as unknown[];


            if (ctx.isTracingEnabled) {
                for (let i = 0; i < codecs.length; i++){
                    const elem = val[i];
                    const codec = codecs[i];

                    ctx.unsafeEnter(`${typename}[${i}]`, i);

                    try {
                        target.push(codec.$encode(elem, ctx));
                    } finally {
                        ctx.unsafeLeave();
                    }
                }
            } else {
                for (let i = 0; i < codecs.length; i++) {
                    const elem = val[i];
                    const codec = codecs[i];

                    target.push(codec.$encode(elem, ctx));
                }
            }

            return target;
        }

        return Codec.make(typename, decode, encode);
    }
}