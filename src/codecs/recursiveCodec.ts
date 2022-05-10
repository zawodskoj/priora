import { Codec, CodecType } from "../codec";
import { DecodingContext } from "../context";
import { ObjectCodecImpl } from "./objectCodec";

export namespace RecursiveCodecImpl {
    import ObjectSchema = ObjectCodecImpl.ObjectSchema;

    export type RecurCodec<T extends object, S extends ObjectSchema<T>> = Codec<CodecType<ObjectCodecImpl.ObjectCodec<T, S>>>;

    export function create<T extends object, C extends ObjectCodecImpl.ObjectSchema<T>>(typename: string, mkCodec: (_: RecurCodec<T, C>) => C): RecurCodec<T, C> {
        type Result = CodecType<RecurCodec<T, C>>;

        let knot: RecurCodec<T, C>;
        let instance: ObjectCodecImpl.ObjectCodec<T, C> | undefined;

        function getInstance(): ObjectCodecImpl.ObjectCodec<T, C> {
            if (instance) return instance;
            if (!knot) throw new Error("Try again");

            return instance = ObjectCodecImpl.create(typename, mkCodec(knot), true);
        }

        function decode(val: unknown, ctx: DecodingContext): Result {
            return getInstance().$decode(val, ctx);
        }

        function encode(val: Result): unknown {
            return getInstance().$encode(val);
        }

        return knot = Codec.make(typename, decode, encode);
    }

}