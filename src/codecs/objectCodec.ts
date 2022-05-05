import { Codec } from "../codec";
import { DecodingContext } from "../context";

export namespace ObjectCodecImpl {
    export type ObjectSchema<T = any> = { [key in keyof T]: Codec<T[key]> }

    export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
    type OptKeys<T> = { [key in keyof T]: [undefined] extends [T[key]] ? key : never }[keyof T];
    type ReqKeys<T> = { [key in keyof T]: [undefined] extends [T[key]] ? never : key }[keyof T];
    export type ObjectResult<T> = Expand<Pick<T, ReqKeys<T>> & Partial<Pick<T, OptKeys<T>>>>

    class Impl<T extends object, P extends ObjectResult<T> | Partial<ObjectResult<T>>> extends Codec<P> {
        constructor(
            readonly name: string,
            readonly schema: ObjectSchema<T>,
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

    export class ObjectCodec<T extends object> extends Impl<T, ObjectResult<T>> {
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

        get partial(): PartialObjectCodec<T> {
            return new PartialObjectCodec(this.name, this.schema, this.suppressContext);
        }
    }

    export class PartialObjectCodec<T extends object> extends Impl<T, Partial<ObjectResult<T>>> {
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
}