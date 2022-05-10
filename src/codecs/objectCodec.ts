import { Codec, OptionalCodec } from "../codec";
import { DecodingContext } from "../context";

export namespace ObjectCodecImpl {
    export type ObjectSchema<T = any> = {
        [key in keyof T]-?: undefined extends T[key] ? undefined extends Required<T>[key] ? Codec<T[key]> : OptionalCodec<Exclude<T[key], undefined>> : Codec<T[key]>
    }

    export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
    type OptKeys<T> = { [key in keyof T]: T[key] extends OptionalCodec<infer _> ? key : never }[keyof T];
    type ReqKeys<T> = { [key in keyof T]: T[key] extends OptionalCodec<infer _> ? never : key }[keyof T];
    type FixValues<T> = { [key in keyof T]: T[key] extends Codec<infer CT> ? CT : never };
    // dbg
    // export type ObjectResult<S> = Expand<S>;
    export type ObjectResult<S> = Expand<FixValues<Pick<S, ReqKeys<S>>> & Partial<FixValues<Pick<S, OptKeys<S>>>>>

    class Impl<T extends object, S extends ObjectSchema<T>, P extends ObjectResult<S> | Partial<ObjectResult<S>>> extends Codec<P> {
        constructor(
            readonly name: string,
            readonly schema: S,
            private readonly properties: [keyof T & string, Codec<unknown>][],
            private readonly isPartial: boolean,
            protected readonly suppressContext: boolean
        ) {
            super()
        }

        $decode(val: unknown, ctx: DecodingContext): P {
            if (typeof val !== "object" || val === null)
                return ctx.failure("Failed to decode object - object expected", val);

            const coercedVal = val as Record<keyof T, unknown>;
            const target = { } as T;

            for (const [propertyName, propertyCodec] of this.properties) {
                if (!this.isPartial || coercedVal[propertyName] !== undefined) {
                    if (this.suppressContext) {
                        target[propertyName] = propertyCodec.$decode(coercedVal[propertyName], ctx) as T[typeof propertyName];
                    } else {
                        ctx.unsafeEnter(this.name + "." + propertyName, propertyName);
                        try {
                            target[propertyName] = propertyCodec.$decode(coercedVal[propertyName], ctx) as T[typeof propertyName];
                        } finally {
                            ctx.unsafeLeave();
                        }
                    }
                }
            }

            return target as unknown as P;
        }

        $encode(val: P): unknown {
            const target = { } as Record<keyof T, unknown>;

            for (const [propertyName, propertyCodec] of this.properties) {
                if (!this.isPartial || val[propertyName as never] !== undefined) {
                    target[propertyName] = propertyCodec.$encode(val[propertyName as never]);
                }
            }

            return target;
        }
    }

    export type ObjectCodecFromSchema<S extends ObjectSchema> =
        ObjectResult<S> extends infer R ? R extends object ? S extends ObjectSchema<R> ? ObjectCodec<R, S> : never : never : never;

    export class ObjectCodec<T extends object, S extends ObjectSchema<T>> extends Impl<T, S, ObjectResult<S>> {
        constructor(
            name: string,
            schema: S,
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

        get partial(): PartialObjectCodec<T, S> {
            return new PartialObjectCodec(this.name, this.schema, this.suppressContext);
        }
    }

    export class PartialObjectCodec<T extends object, S extends ObjectSchema<T>> extends Impl<T, S, Partial<ObjectResult<S>>> {
        constructor(
            name: string,
            schema: S,
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

    export function create<T extends object, S extends ObjectSchema<T>>(typename: string, schema: S, suppressContext: boolean = false): ObjectCodec<T, S> {
        return new ObjectCodec<T, S>(typename, schema, suppressContext);
    }
}