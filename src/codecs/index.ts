import {Codec, identity} from "../codec";
import {ObjectCodecImpl} from "./objectCodec";
import {CasesCodecImpl} from "./casesCodec";
import {ArrayCodecImpl} from "./arrayCodec";
import {RecursiveCodecImpl} from "./recursiveCodec";
import {RecordCodecImpl} from "./recordCodec";
import {KeyCodec} from "../keyCodec";

export namespace Codecs {
    interface PrimitiveHelperMap {
        number: number
        string: string
        boolean: boolean
    }

    function primitive<T extends keyof PrimitiveHelperMap>(typ: T): Codec<PrimitiveHelperMap[T]> {
        return Codec.make<PrimitiveHelperMap[T]>(
            typ,
            (val, ctx) => {
                if (typeof val === typ) return val as PrimitiveHelperMap[T];
                else return ctx.failure(`Failed to decode ${typ} - type mismatch`, val);
            },
            identity
        )
    }

    function singleton<T extends string | number | boolean | null | undefined>(singleton: T): Codec<T> {
        return Codec.make<T>(
            `singleton(${singleton})`,
            (val, ctx) => {
                if (val === singleton) return singleton;
                else return ctx.failure("Failed to decode singleton - value mismatch", val);
            },
            identity
        )
    }

    export const number = primitive("number");
    export const string = primitive("string");
    export const boolean = primitive("boolean");

    export const $null = singleton(null);
    export const $true = singleton(true);
    export const $false = singleton(false);

    export function literals<Ts extends [string, ...string[]]>(name: string, ts: Ts): Codec<Ts[number]> {
        return Codec.make<Ts[number]>(
            name,
            (val, ctx) => {
                if (typeof val !== "string") return ctx.failure("Failed to decode literal - value is not a string", val);

                for (const t of ts) {
                    if (val === t) return t;
                }

                return ctx.failure("Failed to decode literal - none matched", val);
            },
            identity
        )
    }

    export const stringKey = KeyCodec.make<string>("string", identity, identity);
    export function literalKeys<Ts extends [string, ...string[]]>(name: string, ts: Ts): KeyCodec<Ts[number]> {
        return KeyCodec.make<Ts[number]>(
            name,
            (val, ctx) => {
                for (const t of ts) {
                    if (val === t) return t;
                }

                return ctx.failure("Failed to decode literal - none matched", val);
            },
            identity
        )
    }

    export function objectSchema<T>(schema: ObjectSchema<T>): ObjectSchema<T> {
        return schema;
    }

    export type ObjectSchema<T> = ObjectCodecImpl.ObjectSchema<T>;
    export function object<T>(typename: string, schema: ObjectSchema<T>): Codec<T> {
        return ObjectCodecImpl.create(typename, schema);
    }

    export function partial<T>(typename: string, schema: ObjectSchema<T>): Codec<Partial<T>> {
        return ObjectCodecImpl.createPartial(typename, schema);
    }

    export type CasesSchema = CasesCodecImpl.ObjectSchema;
    export function cases<T extends CasesSchema, D extends string>(typename: string, discriminator: D, schema: T): Codec<CasesCodecImpl.UnwrapSchema<T, D>> {
        return CasesCodecImpl.create<T, D>(typename, discriminator, schema);
    }

    export function array<T>(codec: Codec<T>): Codec<T[]> {
        return ArrayCodecImpl.create<T>(codec.name + "[]", codec);
    }

    export function recursive<T extends object>(typename: string) {
        return <C extends ObjectSchema<T>>(mkCodec: (knot: Codec<T>) => C): Codec<T> => {
            return RecursiveCodecImpl.create<T, C>(typename, mkCodec);
        }
    }

    export function record<T>(codec: Codec<T>): Codec<Record<string, T>>
    export function record<T, L extends string>(codec: Codec<T>, keyCodec: KeyCodec<L>): Codec<Record<L, T>>
    export function record<T, L extends string>(codec: Codec<T>, keyCodec?: KeyCodec<L>): Codec<Record<L, T>> {
        return RecordCodecImpl.create(codec, keyCodec, false);
    }

    export function partialRecord<T>(codec: Codec<T>): Codec<Partial<Record<string, T>>>
    export function partialRecord<T, L extends string>(codec: Codec<T>, keyCodec: KeyCodec<L>): Codec<Partial<Record<L, T>>>
    export function partialRecord<T, L extends string>(codec: Codec<T>, keyCodec?: KeyCodec<L>): Codec<Partial<Record<L, T>>> {
        return RecordCodecImpl.create(codec, keyCodec, true);
    }

    export function map<T>(codec: Codec<T>): Codec<Map<string, T>>
    export function map<T, L>(codec: Codec<T>, keyCodec: KeyCodec<L>): Codec<Map<L, T>>
    export function map<T, L>(codec: Codec<T>, keyCodec?: KeyCodec<L>): Codec<Map<L, T>> {
        return RecordCodecImpl.createMap(codec, keyCodec);
    }
}