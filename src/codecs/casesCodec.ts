import { Codec } from "../codec";
import { ObjectCodecImpl } from "./objectCodec";
import { DecodingContext, EncodingContext } from "../context";
import { Codecs } from "./index";
import ObjectSchema = ObjectCodecImpl.ObjectSchema;
import ObjectCodec = ObjectCodecImpl.ObjectCodec;
import ObjectResult = ObjectCodecImpl.ObjectResult;
import ObjectCodecFromSchema = ObjectCodecImpl.ObjectCodecFromSchema;
import Expand = ObjectCodecImpl.Expand;

export type CasesCodecResult<
    D extends string,
    BS extends ObjectSchema,
    SS extends Record<H, ObjectSchema>,
    H extends string
> = {
    [key in H]: Expand<{ [_ in D]: key } & ObjectResult<BS & SS[key]>>
}[H]

export type CasesSchema<
    S extends Record<H, ObjectSchema>,
    H extends string
> = {
    [key in H]: S[key]
}

type AnyCasesCodec<
    D extends string,
    BS extends ObjectSchema,
    SS extends Record<H, ObjectSchema>,
    H extends string
> = ClosedCasesCodec<D, BS, SS, H> | CasesCodec<D, BS, SS, any, H>

export type PickCase<C, K extends string> =
    C extends AnyCasesCodec<infer D, infer BS, infer SS, infer H>
        ? K extends H
            ? { [key in K]: Expand<{ [_ in D]: key } & ObjectResult<BS & SS[key]>> }[K]
            : never
        : never

export class ClosedCasesCodec<
    D extends string,
    BS extends ObjectSchema,
    SS extends Record<H, ObjectSchema>,
    H extends string
> extends Codec<CasesCodecResult<D, BS, SS, H>> {
    private caseCodecs: Record<string, ObjectCodec<any, any>>;

    constructor (
        readonly name: string,
        readonly discriminator: D,
        readonly baseSchema: BS,
        readonly casesSchema: CasesSchema<SS, H>
    ) {
        super();

        const caseCodecs: Record<string, ObjectCodec<any, any>> = {};

        for (const [caseName, schema] of Object.entries(casesSchema)) {
            caseCodecs[caseName] = new ObjectCodec(
                name + "#" + caseName,
                { ...baseSchema, ...(schema as object) },
                false
            );
        }

        this.caseCodecs = caseCodecs;
    }

    open(): CasesCodec<D, BS, SS, H, H> {
        return new CasesCodec<D, BS, SS, H, H>(
            this.name,
            this.discriminator,
            this.baseSchema,
            this.casesSchema
        )
    }

    $decode(val: unknown, ctx: DecodingContext): CasesCodecResult<D, BS, SS, H> {
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

        const caseCodec = this.caseCodecs[discriminator];
        if (!caseCodec) {
            return ctx.failure("Failed to decode cases - none matched", val);
        }

        const result = caseCodec.$decode(val, ctx)
        result[this.discriminator] = discriminator;

        return result as never;
    }

    $encode(val: CasesCodecResult<D, BS, SS, H>, ctx: EncodingContext): unknown {
        const discriminator = val[this.discriminator as never];

        const caseCodec = this.caseCodecs[discriminator];
        if (!caseCodec) {
            return ctx.failure("Failed to decode cases - none matched", val);
        }

        const result = caseCodec.$encode(val, ctx);
        (result as Record<string, unknown>)[this.discriminator] = discriminator;

        return result;
    }

    pick<C extends H>(caseName: C): ObjectCodecFromSchema<BS & SS[C] & { [_ in D]: Codec<C> }> {
        return ObjectCodecImpl.create(this.name + "#" + caseName, {
            ...this.baseSchema,
            [this.discriminator]: Codecs.literals(caseName, [caseName]),
            ...this.casesSchema[caseName]
        } as never) as never;
    }
}

export class CasesCodec<
    D extends string,
    BS extends ObjectSchema,
    SS extends Record<OH, ObjectSchema>,
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
        readonly baseSchema: BS,
        readonly casesSchema: CasesSchema<SS, OH>
    ) {}

    base<B2 extends object, BS2 extends ObjectSchema<B2>>(baseSchema: BS2): CasesCodec<D, BS2, SS, CH, OH> {
        return new CasesCodec(
            this.name,
            this.discriminator,
            baseSchema,
            this.casesSchema
        )
    }

    similar<C extends Exclude<CH, OH>, O extends object, OS extends ObjectSchema<O>>(
        caseNames: C[],
        caseSchema: OS
    ): CasesCodec<D, BS, SS & { [_ in C]: OS }, CH, OH | C> {
        const newSchema = { ...this.casesSchema } as SS & { [_ in C]: OS };

        for (const caseName of caseNames)
            newSchema[caseName] = caseSchema as never;

        return new CasesCodec(
            this.name,
            this.discriminator,
            this.baseSchema,
            newSchema as never
        )
    }

    single<C extends Exclude<CH, OH>, O extends object, OS extends ObjectSchema<O>>(
        caseName: C,
        caseSchema: OS
    ): CasesCodec<D, BS, SS & { [_ in C]: OS }, CH, OH | C> {
        return this.similar<C, O, OS>([caseName], caseSchema);
    }

    empty<C extends Exclude<CH, OH>>(...caseNames: C[]): CasesCodec<D, BS, SS & { [_ in C]: {} }, CH, OH | C> {
        return this.similar<C, {}, {}>(caseNames, { });
    }

    close(): [CH] extends [OH] ? ClosedCasesCodec<D, BS, SS, CH> : ["Error - unclosed cases:", Exclude<CH, OH>] {
        return new ClosedCasesCodec<D, BS, never, CH>(
            this.name,
            this.discriminator,
            this.baseSchema,
            this.casesSchema as never
        ) as never;
    }

    drop<C extends CH>(caseName: C): CasesCodec<D, BS, Omit<SS, C>, CH, Exclude<OH, C>> {
        const newSchema = { ...this.casesSchema };
        delete newSchema[caseName as never];

        return new CasesCodec(
            this.name,
            this.discriminator,
            this.baseSchema,
            newSchema as never
        )
    }

    narrow<C extends Exclude<CH, OH>>(_caseName: C): CasesCodec<D, BS, SS, Exclude<CH, C>, Exclude<OH, C>> {
        return this as never;
    }

    dropAndNarrow<C extends CH>(caseName: C): CasesCodec<D, BS, Omit<SS, C>, Exclude<CH, C>, Exclude<OH, C>> {
        return this.drop(caseName) as never;
    }

    rebase<B2 extends object, BS2 extends ObjectSchema<B2>>(rebaseFn: (base: BS) => BS2): CasesCodec<D, BS2, SS, CH, OH> {
        return new CasesCodec(
            this.name,
            this.discriminator,
            rebaseFn(this.baseSchema),
            this.casesSchema
        )
    }

    pick<C extends OH>(caseName: C): ObjectCodecFromSchema<BS & SS[C] & { [_ in D]: Codec<C> }> {
        return ObjectCodecImpl.create(this.name + "#" + caseName, {
            ...this.baseSchema,
            [this.discriminator]: Codecs.literals(caseName, [caseName]),
            ...this.casesSchema[caseName]
        } as never) as never;
    }
}