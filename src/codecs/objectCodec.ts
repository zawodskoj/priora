import { Codec, ReportUnknownProperties, OptionalCodec } from "../codec";
import { DecodingContext, EncodingContext } from "../context";
import { enter } from "../contextual.stub";

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
            private readonly properties: [string & keyof T, Codec<unknown>][],
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

            const decodeSingleField =
                this.suppressContext || !ctx.isTracingEnabled
                    ? (propertyName: string & keyof T, propertyCodec: Codec<T[keyof T]>) => {
                        const propVal = coercedVal[propertyName];

                        if (!this.isPartial || propVal !== undefined) {
                            target[propertyName] = propertyCodec.$decode(propVal, ctx) as T[typeof propertyName];
                        }
                    }
                    : (propertyName: string & keyof T, propertyCodec: Codec<T[keyof T]>) => {
                        const propVal = coercedVal[propertyName];

                        if (!this.isPartial || propVal !== undefined) {
                            enter(ctx, this.name + "." + propertyName, propertyName, () => {
                                target[propertyName] = propertyCodec.$decode(propVal, ctx) as T[typeof propertyName];
                            });
                        }
                    }

            if (ctx.errorHandlingOptions.reportUnknownProperties & ReportUnknownProperties.ON_DECODE) {
                for (const propertyName in coercedVal) {
                    const propertyCodec = this.schema[propertyName];

                    if (!propertyCodec) {
                        ctx.warn(`Unknown property ${propertyName} was not declared in schema`, coercedVal);
                        continue;
                    }

                    decodeSingleField(propertyName, propertyCodec as unknown as Codec<T[keyof T]>);
                }

                if (!this.isPartial) {
                    for (const [propertyName] of this.properties) {
                        if (propertyName in target)
                            continue;

                        return ctx.failure(`Missing property ${propertyName}`, coercedVal);
                    }
                }
            } else {
                for (const [propertyName, propertyCodec] of this.properties) {
                    decodeSingleField(propertyName, propertyCodec as Codec<T[keyof T]>);
                }
            }

            return target as unknown as P;
        }

        $encode(val: P, ctx: EncodingContext): unknown {
            const target = { } as Record<keyof T, unknown>;

            const encodeSingleField =
                this.suppressContext || !ctx.isTracingEnabled
                    ? (propertyName: string & keyof T, propertyCodec: Codec<unknown>) => {
                        const propVal = val[propertyName as never];

                        if (!this.isPartial || propVal !== undefined) {
                            target[propertyName] = propertyCodec.$encode(propVal, ctx);
                        }
                    }
                    : (propertyName: string & keyof T, propertyCodec: Codec<unknown>) => {
                        const propVal = val[propertyName as never];

                        if (!this.isPartial || propVal !== undefined) {
                            enter(ctx, this.name + "." + propertyName, propertyName, () => {
                                target[propertyName] = propertyCodec.$encode(propVal, ctx);
                            });
                        }
                    };

            if (ctx.errorHandlingOptions.reportUnknownProperties & ReportUnknownProperties.ON_DECODE) {
                for (const propertyName in val) {
                    const propertyCodec = this.schema[propertyName as never];

                    if (!propertyCodec) {
                        ctx.warn(`Unknown property ${propertyName} was not declared in schema`, val);
                        continue;
                    }

                    encodeSingleField(propertyName as never, propertyCodec);
                }

                if (!this.isPartial) {
                    for (const [propertyName] of this.properties) {
                        if (propertyName in target)
                            continue;

                        return ctx.failure(`Missing property ${propertyName}`, val);
                    }
                }
            } else {
                for (const [propertyName, propertyCodec] of this.properties) {
                    encodeSingleField(propertyName, propertyCodec);
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