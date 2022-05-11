import { Codec, CodecType, identity } from "../codec";
import { ObjectCodecImpl } from "./objectCodec";
import { CasesCodec, PickCase as PickCase_ } from "./casesCodec";
import { ArrayCodecImpl } from "./arrayCodec";
import { RecursiveCodecImpl } from "./recursiveCodec";
import { RecordCodecImpl } from "./recordCodec";
import { KeyCodec } from "../keyCodec";

export namespace Codecs {
    import TupleCodecs = ArrayCodecImpl.TupleCodecs;

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
            (val, ctx) => {
                if (ctx.errorHandlingOptions.strictPrimitives) {
                    if (typeof val === typ) return val as PrimitiveHelperMap[T];
                    else return ctx.failure(`Failed to encode ${typ} - type mismatch`, val);
                }

                return val;
            }
        )
    }

    export function singleton<T extends string | number | boolean | null | undefined>(singleton: T): Codec<T> {
        return Codec.make<T>(
            `singleton(${singleton})`,
            (val, ctx) => {
                if (val === singleton) return singleton;
                else return ctx.failure("Failed to decode singleton - value mismatch", val);
            },
            (val, ctx) => {
                if (ctx.errorHandlingOptions.strictPrimitives) {
                    if (val === singleton) return singleton;
                    else return ctx.failure(`Failed to encode singleton - value mismatch`, val);
                }

                return val;
            }
        )
    }

    export const number = primitive("number");
    export const string = primitive("string");
    export const boolean = primitive("boolean");

    export const unknown = Codec.make("unknown", v => v, v => v, true, true);

    export function literals<L extends string, Ts extends [L, ...L[]]>(name: string, ts: Ts): Codec<Ts[number]> {
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
    export function literalKeys<L extends string, Ts extends [L, ...L[]]>(name: string, ts: Ts): KeyCodec<Ts[number]> {
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

    export type ObjectSchema<T> = ObjectCodecImpl.ObjectSchema<T>;
    export function objectSchema<T>(schema: ObjectSchema<T>): ObjectSchema<T> {
        return schema;
    }

    export type ObjectCodec<T extends object, S extends ObjectSchema<T>> = ObjectCodecImpl.ObjectCodec<T, S>;
    export function object<T extends object, S extends ObjectSchema<T>>(typename: string, schema: S): ObjectCodec<T, S> {
        return ObjectCodecImpl.create(typename, schema);
    }

    export function inline<T extends object, S extends ObjectSchema<T>>(schema: S): ObjectCodec<T, S> {
        return ObjectCodecImpl.create("<inline type>", schema);
    }

    export type PickCase<C, K extends string> = PickCase_<C, K>;
    export function cases<H extends string>(typename: string) {
        return CasesCodec.make<H>(typename);
    }

    export function array<T>(codec: Codec<T>): Codec<T[]> {
        return ArrayCodecImpl.create<T>(codec.name + "[]", codec);
    }

    export function tuple<T extends [any, ...any[]]>(codecs: TupleCodecs<T>): Codec<T> {
        return ArrayCodecImpl.createTuple<T>(`[${codecs.map(x => x.name).join(", ")}]`, codecs);
    }

    export function recursive<T extends object>(typename: string) {
        return <C extends ObjectSchema<T>>(mkCodec: (knot: RecursiveCodecImpl.RecurCodec<T, C>) => C): RecursiveCodecImpl.RecurCodec<T, C> => {
            return RecursiveCodecImpl.create<T, C>(typename, mkCodec);
        }
    }

    export function record<T>(codec: Codec<T>): Codec<Record<string, T>>
    export function record<T, L extends string>(codec: Codec<T>, keyCodec: KeyCodec<L>): Codec<Record<L, T>>
    export function record<T, L extends string>(codec: Codec<T>, keyCodec?: KeyCodec<L>): Codec<Record<L, T>> {
        return RecordCodecImpl.create(codec, keyCodec);
    }

    export function map<T>(codec: Codec<T>): Codec<Map<string, T>>
    export function map<T, L>(codec: Codec<T>, keyCodec: KeyCodec<L>): Codec<Map<L, T>>
    export function map<T, L>(codec: Codec<T>, keyCodec?: KeyCodec<L>): Codec<Map<L, T>> {
        return RecordCodecImpl.createMap(codec, keyCodec);
    }
}