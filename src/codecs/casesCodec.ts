import { Codec } from "../codec";
import { ObjectCodecImpl } from "./objectCodec";
import { DecodingContext } from "../context";
import { Codecs } from "./index";
import ObjectSchema = ObjectCodecImpl.ObjectSchema;
import ObjectCodec = ObjectCodecImpl.ObjectCodec;
import ObjectResult = ObjectCodecImpl.ObjectResult;

export type CasesCodecResult<
    D extends string,
    B extends object,
    S extends Record<H, object>,
    H extends string
> = {
    [key in H]: ObjectResult<B & S[key]> & { [_ in D]: key }
}[H]

export type CasesSchema<
    S extends Record<H, object>,
    H extends string
> = {
    [key in H]: ObjectSchema<S[key]>
}

export type PickCase<C, K extends string> =
    C extends ClosedCasesCodec<infer D, infer B, infer S, infer H>
        ? [K] extends [H]
            ? ObjectResult<B> & { [key in K]: ObjectResult<S[key]> & { [_ in D]: key } }[K]
            : never
        : C extends CasesCodec<infer D, infer B, infer S, infer CH, infer OH>
            ? [K] extends [OH]
                ? ObjectResult<B> & { [key in K]: ObjectResult<S[key]> & { [_ in D]: key } }[K]
                : never
            : never

export class ClosedCasesCodec<
    D extends string,
    B extends object,
    S extends Record<H, object>,
    H extends string
> extends Codec<CasesCodecResult<D, B, S, H>> {
    private casesMap: Record<string, [string, Codec<unknown>][]>

    constructor (
        readonly name: string,
        readonly discriminator: D,
        readonly baseSchema: ObjectSchema<B>,
        readonly casesSchema: CasesSchema<S, H>
    ) {
        super();

        const casesMap: Record<string, [string, Codec<unknown>][]> = {};

        for (const [name, schema] of Object.entries(casesSchema)) {
            casesMap[name] = Object.entries({ ...baseSchema, ...(schema as object) }) as [string, Codec<unknown>][];
        }

        this.casesMap = casesMap;
    }

    open(): CasesCodec<D, B, S, H, H> {
        return new CasesCodec<D, B, S, H, H>(
            this.name,
            this.discriminator,
            this.baseSchema,
            this.casesSchema
        )
    }

    $decode(val: unknown, ctx: DecodingContext): CasesCodecResult<D, B, S, H> {
        if (typeof val !== "object" || val === null) return ctx.failure("Failed to decode cases - object expected", val);

        const coercedVal = val as Record<string, unknown>;

        if (!coercedVal[this.discriminator]) {
            return ctx.failure("Failed to decode cases - object with discriminator expected", val);
        }

        const discriminator = coercedVal[this.discriminator];

        // noinspection SuspiciousTypeOfGuard
        if (typeof discriminator !== "string") {
            return ctx.failure("Failed to decode cases - discriminator is not a string", val);
        }

        const caseProperties = this.casesMap[discriminator];
        if (!caseProperties) {
            return ctx.failure("Failed to decode cases - none matched", val);
        }

        try {
            ctx.unsafeEnter(this.name + "#" + discriminator, undefined);
            const target = {
                [this.discriminator]: discriminator
            };

            for (const [propertyName, propertyCodec] of caseProperties) {
                ctx.unsafeEnter(this.name + "#" + discriminator + "." + propertyName, propertyName);
                try {
                    target[propertyName] = propertyCodec.$decode(coercedVal[propertyName], ctx) as never;
                } finally {
                    ctx.unsafeLeave();
                }
            }

            return target as never;
        } finally {
            ctx.unsafeLeave();
        }
    }

    $encode(val: CasesCodecResult<D, B, S, H>): unknown {
        const caseProperties = this.casesMap[val[this.discriminator as never]];
        if (!caseProperties) throw new Error(); // TODO error message

        const target = {
            [this.discriminator]: val[this.discriminator as never]
        } as Record<string, unknown>;

        for (const [propertyName, propertyCodec] of caseProperties) {
            target[propertyName] = propertyCodec.$encode(val[propertyName as never]);
        }

        return target;
    }

    pick<C extends H>(caseName: C): ObjectCodec<B & S[C] & { [_ in D]: C }> {
        return ObjectCodecImpl.create(this.name + "#" + caseName, {
            ...this.baseSchema,
            [this.discriminator]: Codecs.literals(caseName, [caseName]),
            ...this.casesSchema[caseName]
        } as never);
    }
}

export class CasesCodec<
    D extends string,
    B extends object,
    S extends Record<OH, object>,
    CH extends string,
    OH extends CH
> {
    static make<CH extends string>(name: string) {
        return {
            withDiscriminator<D extends string>(discriminator: D) {
                return new CasesCodec<D, {}, {}, CH, never>(name, discriminator, {}, {});
            }
        }
    }

    constructor (
        readonly name: string,
        readonly discriminator: D,
        readonly baseSchema: ObjectSchema<B>,
        readonly casesSchema: CasesSchema<S, OH>
    ) {}

    base<B2 extends object>(baseSchema: ObjectSchema<B2>): CasesCodec<D, B2, S, CH, OH> {
        return new CasesCodec(
            this.name,
            this.discriminator,
            baseSchema,
            this.casesSchema
        )
    }

    similar<C extends Exclude<CH, OH>, O extends object>(
        caseNames: C[],
        caseSchema: ObjectSchema<O>
    ): CasesCodec<D, B, S & { [_ in C]: O }, CH, OH | C> {
        const newSchema = { ...this.casesSchema } as S & { [_ in C]: O };

        for (const caseName of caseNames)
            newSchema[caseName] = caseSchema as never;

        return new CasesCodec(
            this.name,
            this.discriminator,
            this.baseSchema,
            newSchema as never
        )
    }

    single<C extends Exclude<CH, OH>, O extends object>(
        caseName: C,
        caseSchema: ObjectSchema<O>
    ): CasesCodec<D, B, S & { [_ in C]: O }, CH, OH | C> {
        return this.similar<C, O>([caseName], caseSchema);
    }

    empty<C extends Exclude<CH, OH>>(...caseNames: C[]): CasesCodec<D, B, S & { [_ in C]: {} }, CH, OH | C> {
        return this.similar<C, {}>(caseNames, { });
    }

    close(): [CH] extends [OH] ? ClosedCasesCodec<D, B, S, CH> : never {
        return new ClosedCasesCodec<D, B, never, CH>(
            this.name,
            this.discriminator,
            this.baseSchema,
            this.casesSchema as never
        ) as never;
    }

    drop<C extends CH>(caseName: C): CasesCodec<D, B, Omit<S, C>, CH, Exclude<OH, C>> {
        const newSchema = { ...this.casesSchema };
        delete newSchema[caseName as never];

        return new CasesCodec(
            this.name,
            this.discriminator,
            this.baseSchema,
            newSchema as never
        )
    }

    narrow<C extends Exclude<CH, OH>>(_caseName: C): CasesCodec<D, B, S, Exclude<CH, C>, Exclude<OH, C>> {
        return this as never;
    }

    dropAndNarrow<C extends CH>(caseName: C): CasesCodec<D, B, Omit<S, C>, Exclude<CH, C>, Exclude<OH, C>> {
        return this.drop(caseName) as never;
    }

    rebase<B2 extends object>(rebaseFn: (base: ObjectSchema<B>) => ObjectSchema<B2>): CasesCodec<D, B2, S, CH, OH> {
        return new CasesCodec(
            this.name,
            this.discriminator,
            rebaseFn(this.baseSchema),
            this.casesSchema
        )
    }

    pick<C extends OH>(caseName: C): ObjectCodec<B & S[C] & { [_ in D]: C }> {
        return ObjectCodecImpl.create(this.name + "#" + caseName, {
            ...this.baseSchema,
            [this.discriminator]: Codecs.literals(caseName, [caseName]),
            ...this.casesSchema[caseName]
        } as never);
    }
}