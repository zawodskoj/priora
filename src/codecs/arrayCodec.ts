import {Codec} from "../codec";
import {DecodingContext} from "../context";

export namespace ArrayCodecImpl {
    export function create<T>(typename: string, codec: Codec<T>): Codec<T[]> {
        function decode(val: unknown, ctx: DecodingContext): T[] {
            if (!Array.isArray(val))
                return ctx.failure("Failed to decode array - array expected", val);

            const coercedArray = val as unknown[];
            const target = [] as T[];

            for (let i = 0; i < coercedArray.length; i++){
                ctx.unsafeEnter(`${typename}[${i}]`, i);

                try {
                    target.push(codec.decode(coercedArray[i], ctx));
                } finally {
                    ctx.unsafeLeave();
                }
            }

            return target;
        }

        function encode(val: T[]): unknown {
            const target = [] as unknown[];

            for (const elem of val) {
                target.push(codec.encode(elem));
            }

            return target;
        }

        return Codec.make(typename, decode, encode);
    }
}