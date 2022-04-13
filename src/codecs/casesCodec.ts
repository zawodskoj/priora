import {Codec} from "../codec";
import {ObjectCodecImpl} from "./objectCodec";
import {DecodingContext} from "../context";

export namespace CasesCodecImpl {
    export type ObjectSchema = Record<string, ObjectCodecImpl.ObjectSchema>;
    export type UnwrapSchema<T extends ObjectSchema, D extends string> = {
        [key in keyof T]: ObjectCodecImpl.UnwrapSchema<T[key]> & { [_ in D]: key }
    }[keyof T];

    export type PickCase<C extends CasesCodec<any, any>, K extends string> =
        C extends CasesCodec<infer T, infer D> ? {
            [key in K]: ObjectCodecImpl.UnwrapSchema<T[key]> & { [_ in D]: key };
        }[K] : never;

    export class CasesCodec<T extends ObjectSchema, D extends string> extends Codec<UnwrapSchema<T, D>> {
        private cases: [string, [string, Codec<any>][]][]

        constructor(
            readonly name: string,
            readonly schema: T,
            readonly discriminator: D
        ) {
            super();

            this.cases = (Object.entries(this.schema) as [string, ObjectCodecImpl.ObjectSchema][])
                .map(([c, s]) => [c, Object.entries(s) as [string, Codec<any>][]]);

            // imma lazy to make typelevel assertion
            for (const [,caseProperties] of this.cases) {
                for (const [property,] of caseProperties) {
                    if (property === discriminator)
                        throw new Error(); // TODO error message
                }
            }
        }

        decode(val: unknown, ctx: DecodingContext): UnwrapSchema<T, D> {
            if (typeof val !== "object") return ctx.failure("Failed to decode cases - object expected", val);

            const coercedVal = val as Record<string, unknown>;

            if (!coercedVal[this.discriminator]) {
                return ctx.failure("Failed to decode cases - object with discriminator expected", val);
            }

            for (const [caseTag, caseProperties] of this.cases) {
                if (coercedVal[this.discriminator] === caseTag) {
                    try {
                        ctx.unsafeEnter(this.name + "#" + caseTag, undefined);
                        const target = {
                            [this.discriminator]: caseTag
                        };

                        for (const [propertyName, propertyCodec] of caseProperties) {
                            ctx.unsafeEnter(this.name + "#" + caseTag + "." + propertyName, propertyName);
                            try {
                                target[propertyName] = propertyCodec.decode(coercedVal[propertyName], ctx) as UnwrapSchema<T, D>[typeof propertyName];
                            } finally {
                                ctx.unsafeLeave();
                            }
                        }

                        return target as UnwrapSchema<T, D>;
                    } finally {
                        ctx.unsafeLeave();
                    }
                }
            }

            return ctx.failure("Failed to decode cases - none matched", val);
        }

        encode(val: UnwrapSchema<T, D>): unknown {
            const target = {
                [this.discriminator]: val[this.discriminator]
            } as Record<string, unknown>;

            const $case = this.cases.find(x => x[0] === val[this.discriminator]);
            if (!$case) throw new Error(); // TODO error message

            for (const [propertyName, propertyCodec] of $case[1]) {
                target[propertyName] = propertyCodec.encode(val[propertyName]);
            }

            return target;
        }
    }

    export function create<T extends ObjectSchema, D extends string>(typename: string, discriminator: D, schema: T): CasesCodec<T, D> {
        return new CasesCodec(typename, schema, discriminator);
    }
}