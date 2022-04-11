import {Codec} from "../codec";
import {ObjectCodecImpl} from "./objectCodec";
import {DecodingContext} from "../context";

export namespace CasesCodecImpl {
    export type ObjectSchema = Record<string, ObjectCodecImpl.ObjectSchema>;
    export type UnwrapSchema<T extends ObjectSchema, D extends string> = {
        [key in keyof T]: ObjectCodecImpl.UnwrapSchema<T[key]> & { [_ in D]: key }
    }[keyof T];

    export function create<T extends ObjectSchema, D extends string>(typename: string, discriminator: D, schema: T): Codec<UnwrapSchema<T, D>> {
        type Result = UnwrapSchema<T, D>;

        const cases = (Object.entries(schema) as [keyof T, ObjectCodecImpl.ObjectSchema][])
            .map(([c, s]) => [c, Object.entries(s) as [keyof T[typeof c] & string, Codec<any>][]] as const);

        // imma lazy to make typelevel assertion
        for (const [,caseProperties] of cases) {
            for (const [property,] of caseProperties) {
                if (property === discriminator)
                    throw new Error(); // TODO error message
            }
        }

        function decode(val: unknown, ctx: DecodingContext): Result {
            if (typeof val !== "object") return ctx.failure("Failed to decode cases - object expected", val);

            const coercedVal = val as Record<keyof Result, unknown>;

            if (!coercedVal[discriminator]) {
                return ctx.failure("Failed to decode cases - object with discriminator expected", val);
            }

            for (const [caseTag, caseProperties] of cases) {
                if (coercedVal[discriminator] === caseTag) {
                    try {
                        ctx.unsafeEnter(typename + "#" + caseTag, undefined);
                        const target = {
                            [discriminator]: caseTag
                        } as Result;

                        for (const [propertyName, propertyCodec] of caseProperties) {
                            ctx.unsafeEnter(typename + "#" + caseTag + "." + propertyName, propertyName);
                            try {
                                target[propertyName] = propertyCodec.decode(coercedVal[propertyName], ctx) as Result[typeof propertyName];
                            } finally {
                                ctx.unsafeLeave();
                            }
                        }

                        return target;
                    } finally {
                        ctx.unsafeLeave();
                    }
                }
            }

            return ctx.failure("Failed to decode cases - none matched", val);
        }

        function encode(val: Result): unknown {
            const target = {
                [discriminator]: val[discriminator]
            } as Record<keyof Result, unknown>;

            const $case = cases.find(x => x[0] === val[discriminator]);
            if (!$case) throw new Error(); // TODO error message

            for (const [propertyName, propertyCodec] of $case[1]) {
                target[propertyName] = propertyCodec.encode(val[propertyName]);
            }

            return target;
        }

        return Codec.make(typename, decode, encode);
    }
}