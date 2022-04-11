import {Codec} from "../codec";
import {DecodingContext} from "../context";
import {ObjectCodecImpl} from "./objectCodec";

export namespace RecursiveCodecImpl {
    export function create<T, C extends ObjectCodecImpl.ObjectSchema<T>>(typename: string, mkCodec: (_: Codec<T>) => C): Codec<T> {
        let knot: Codec<T>;
        let instance: Codec<T> | undefined;

        function getInstance(): Codec<T> {
            if (instance) return instance;
            if (!knot) throw new Error("Try again");

            return instance = ObjectCodecImpl.create(typename, mkCodec(knot), true) as Codec<T>;
        }

        function decode(val: unknown, ctx: DecodingContext): T {
            return getInstance().decode(val, ctx);
        }

        function encode(val: T): unknown {
            return getInstance().encode(val);
        }

        return knot = Codec.make(typename, decode, encode);
    }

}