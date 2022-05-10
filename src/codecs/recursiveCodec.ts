import { Codec, CodecType, OptionalTypeMarker } from "../codec";
import { DecodingContext } from "../context";
import { ObjectCodecImpl } from "./objectCodec";

export namespace RecursiveCodecImpl {
    export type RefillOpts<T> = {
        [key in keyof T]-?: undefined extends T[key] ? T[key] extends Required<T>[key] ? T[key] : Exclude<T[key], undefined> | OptionalTypeMarker : T[key]
    }
    export type RecurCodec<T extends object> = Codec<CodecType<ObjectCodecImpl.ObjectCodec<T>>>;

    export function create<T extends object, C extends ObjectCodecImpl.ObjectSchema<T>>(typename: string, mkCodec: (_: RecurCodec<T>) => C): RecurCodec<T> {
        type Result = CodecType<RecurCodec<T>>;

        let knot: RecurCodec<T>;
        let instance: ObjectCodecImpl.ObjectCodec<T> | undefined;

        function getInstance(): ObjectCodecImpl.ObjectCodec<T> {
            if (instance) return instance;
            if (!knot) throw new Error("Try again");

            return instance = ObjectCodecImpl.create(typename, mkCodec(knot), true);
        }

        // TODO: fix typings (remove nevers) or erase
        function decode(val: unknown, ctx: DecodingContext): Result {
            return getInstance().$decode(val, ctx) as never;
        }

        function encode(val: Result): unknown {
            return getInstance().$encode(val as never);
        }

        return knot = Codec.make(typename, decode, encode) as never;
    }

}