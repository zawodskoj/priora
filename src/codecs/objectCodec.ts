import {Codec, UnwrapCodec} from "../codec";
import {DecodingContext} from "../context";

export namespace ObjectCodecImpl {
    export type ObjectSchema<T = any> = { [key in keyof T]: Codec<T[key]> }
    export type UnwrapSchema<T extends ObjectSchema> = { [key in keyof T]: UnwrapCodec<T[key]>};

    class Impl<T extends object, P extends T | Partial<T>> extends Codec<P> {
        constructor(
            readonly name: string,
            readonly schema: ObjectSchema<T>,
            private readonly properties: [keyof T & string, Codec<unknown>][],
            private readonly partial: boolean,
            private readonly suppressContext: boolean
        ) {
            super()
        }

        decode(val: unknown, ctx: DecodingContext): P {
            if (typeof val !== "object")
                return ctx.failure("Failed to decode object - object expected", val);

            const coercedVal = val as Record<keyof T, unknown>;
            const target = { } as T;

            for (const [propertyName, propertyCodec] of this.properties) {
                if (!this.partial || coercedVal[propertyName] !== undefined) {
                    if (this.suppressContext) {
                        target[propertyName] = propertyCodec.decode(coercedVal[propertyName], ctx) as T[typeof propertyName];
                    } else {
                        ctx.unsafeEnter(this.name + "." + propertyName, propertyName);
                        try {
                            target[propertyName] = propertyCodec.decode(coercedVal[propertyName], ctx) as T[typeof propertyName];
                        } finally {
                            ctx.unsafeLeave();
                        }
                    }
                }
            }

            return target as P;
        }

        encode(val: P): unknown {
            const target = { } as Record<keyof T, unknown>;

            for (const [propertyName, propertyCodec] of this.properties) {
                if (!this.partial || val[propertyName] !== undefined) {
                    target[propertyName] = propertyCodec.encode(val[propertyName]);
                }
            }

            return target;
        }
    }

    export class ObjectCodec<T extends object> extends Impl<T, T> {
        constructor(
            name: string,
            schema: ObjectSchema<T>,
            suppressContext: boolean
        ) {
            super(
                name,
                schema,
                Object.entries(schema) as [keyof T & string, Codec<unknown>][],
                false,
                suppressContext
            );
        }
    }

    export class PartialObjectCodec<T extends object> extends Impl<T, Partial<T>> {
        constructor(
            name: string,
            schema: ObjectSchema<T>,
            suppressContext: boolean
        ) {
            super(
                name,
                schema,
                Object.entries(schema) as [keyof T & string, Codec<unknown>][],
                true,
                suppressContext
            );
        }
    }

    export function create<T extends object>(typename: string, schema: ObjectSchema<T>, suppressContext: boolean = false): ObjectCodec<T> {
        return new ObjectCodec<T>(typename, schema, suppressContext);
    }

    export function createPartial<T extends object>(typename: string, schema: ObjectSchema<T>, suppressContext: boolean = false): PartialObjectCodec<T> {
        return new PartialObjectCodec<T>(typename, schema, suppressContext);
    }
}