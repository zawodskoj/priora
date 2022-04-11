import {Codec, UnwrapCodec} from "../codec";
import {DecodingContext} from "../context";

export namespace ObjectCodecImpl {
    export type ObjectSchema<T = any> = { [key in keyof T]: Codec<T[key]> }
    export type UnwrapSchema<T extends ObjectSchema> = { [key in keyof T]: UnwrapCodec<T[key]>};

    export function create<T extends ObjectSchema>(typename: string, schema: T, suppressContext: boolean = false): Codec<UnwrapSchema<T>> {
        return createImpl<T>(typename, schema, false, suppressContext);
    }

    export function createPartial<T extends ObjectSchema>(typename: string, schema: T, suppressContext: boolean = false): Codec<Partial<UnwrapSchema<T>>> {
        return createImpl<T>(typename, schema, true, suppressContext);
    }

    function createImpl<T extends ObjectSchema>(typename: string, schema: T, partial: boolean, suppressContext: boolean): Codec<UnwrapSchema<T>> {
        type Result = UnwrapSchema<T>;

        const properties = Object.entries(schema) as [keyof T & string, Codec<unknown>][];

        function decode(val: unknown, ctx: DecodingContext): Result {
            if (typeof val !== "object")
                return ctx.failure("Failed to decode object - object expected", val);

            const coercedVal = val as Record<keyof Result, unknown>;
            const target = { } as Result;

            for (const [propertyName, propertyCodec] of properties) {
                if (!partial || coercedVal[propertyName] !== undefined) {
                    ctx.unsafeEnter(typename + "." + propertyName, propertyName);
                    try {
                        target[propertyName] = propertyCodec.decode(coercedVal[propertyName], ctx) as Result[typeof propertyName];
                    } finally {
                        ctx.unsafeLeave();
                    }
                }
            }

            return target;
        }

        function encode(val: Result): unknown {
            const target = { } as Record<keyof Result, unknown>;

            for (const [propertyName, propertyCodec] of properties) {
                if (!partial || val[propertyName] !== undefined) {
                    target[propertyName] = propertyCodec.encode(val[propertyName]);
                }
            }

            return target;
        }

        return Codec.make(typename, decode, encode, suppressContext);
    }
}