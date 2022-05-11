import { Codec, OptionalCodec } from "../codec";
import { DecodingContext, EncodingContext } from "../context";
import { surround } from "../contextual.stub";

export namespace ArrayCodecImpl {
    function createUniversal(typename: string, kind: string, minLength: number, maxLength: number, codecAtIndex: (i: number) => Codec<any>): Codec<any> {
        function decode(val: unknown, ctx: DecodingContext): any {
            if (!Array.isArray(val))
                return ctx.failure("Failed to decode " + kind + " - array expected", val);

            if (!!maxLength && (val.length < minLength || val.length > maxLength))
                return ctx.failure("Failed to decode " + kind + " - wrong element count", val);

            const realLength = maxLength || val.length;

            const coercedArray = val as unknown[];
            const target: unknown[] = [];

            surround(ctx, (enter) => {
                for (let i = 0; i < realLength; i++){
                    enter(`${typename}[${i}]`, i, () => {
                        const elem = coercedArray[i];
                        const codec = codecAtIndex(i);

                        try {
                            target.push(codec.$decode(elem, ctx));
                        } finally {
                            ctx.unsafeLeave();
                        }
                    })
                }
            })

            return target;
        }

        function encode(val: any, ctx: EncodingContext): unknown {
            // TODO: strict length checks
            const target = [] as unknown[];

            const realLength = maxLength || val.length;

            surround(ctx, (enter) => {
                for (let i = 0; i < realLength; i++){
                    enter(`${typename}[${i}]`, i, () => {
                        const elem = val[i];
                        const codec = codecAtIndex(i);

                        try {
                            target.push(codec.$encode(elem, ctx));
                        } finally {
                            ctx.unsafeLeave();
                        }
                    })
                }
            })

            return target;
        }

        return Codec.make(typename, decode, encode);
    }

    export function create<T>(typename: string, codec: Codec<T>): Codec<T[]> {
        return createUniversal(typename, "array", 0, 0, () => codec);
    }

    export type TupleCodecs<T extends [any, ...any[]]> = {
        [key in keyof T]: Codec<T[key]>
    }
    export type TupleResult<S> =
        S extends [infer Head, ...infer Rest]
            ? Head extends OptionalCodec<infer HeadT>
                ? [HeadT?, ...TupleResult<Rest>]
                : [Head extends Codec<infer HeadT> ? HeadT : never, ...TupleResult<Rest>]
            : [];

    export function createTuple<T extends [any, ...any[]], S extends TupleCodecs<T>>(typename: string, codecs: S): Codec<TupleResult<S>> {
        let minLength = codecs.length;

        for (let i = codecs.length - 1; i >= 0; i--) {
            if (codecs[i] instanceof OptionalCodec) {
                minLength--;
            } else {
                break;
            }
        }

        return createUniversal(typename, "tuple", minLength, codecs.length, i => codecs[i]);
    }
}