import {Codec, UnwrapCodec} from "../codec";
import {DecodingContext} from "../context";

export namespace ObjectCodecImpl {
    export type ObjectSchema<T = any> = { [key in keyof T]: Codec<T[key]> }
    export type UnwrapSchema<T extends ObjectSchema> = { [key in keyof T]: UnwrapCodec<T[key]>};

    export function create<T>(typename: string, schema: ObjectSchema<T>, suppressContext: boolean = false): Codec<T> {
        return createImpl<T>(typename, schema, false, suppressContext);
    }

    export function createPartial<T>(typename: string, schema: ObjectSchema<T>, suppressContext: boolean = false): Codec<Partial<T>> {
        return createImpl<T>(typename, schema, true, suppressContext);
    }

    function createImpl<T>(typename: string, schema: ObjectSchema<T>, partial: boolean, suppressContext: boolean): Codec<T> {
        const properties = Object.entries(schema) as [keyof T & string, Codec<unknown>][];

        function decode(val: unknown, ctx: DecodingContext): T {
            if (typeof val !== "object")
                return ctx.failure("Failed to decode object - object expected", val);

            const coercedVal = val as Record<keyof T, unknown>;
            const target = { } as T;

            for (const [propertyName, propertyCodec] of properties) {
                if (!partial || coercedVal[propertyName] !== undefined) {
                    ctx.unsafeEnter(typename + "." + propertyName, propertyName);
                    try {
                        target[propertyName] = propertyCodec.decode(coercedVal[propertyName], ctx) as T[typeof propertyName];
                    } finally {
                        ctx.unsafeLeave();
                    }
                }
            }

            return target;
        }

        function encode(val: T): unknown {
            const target = { } as Record<keyof T, unknown>;

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