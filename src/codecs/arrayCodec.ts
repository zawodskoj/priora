import { Codec } from "../codec";
import { DecodingContext, EncodingContext } from "../context";
import { surround } from "../contextual.stub";

export namespace ArrayCodecImpl {
    function createUniversal(typename: string, kind: string, length: number, codecAtIndex: (i: number) => Codec<any>): Codec<any> {
        function decode(val: unknown, ctx: DecodingContext): any {
            if (!Array.isArray(val))
                return ctx.failure("Failed to decode " + kind + " - array expected", val);

            if (!!length && (val.length !== length))
                return ctx.failure("Failed to decode " + kind + " - wrong element count", val);

            const realLength = length || val.length;

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

            const realLength = length || val.length;

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
        return createUniversal(typename, "array", 0, () => codec);
    }

    export type TupleCodecs<T extends [any, ...any[]]> = {
        [key in keyof T]: Codec<T[key]>
    }

    export function createTuple<T extends [any, ...any[]]>(typename: string, codecs: TupleCodecs<T>): Codec<T> {
        return createUniversal(typename, "tuple", codecs.length, i => codecs[i]);
    }
}