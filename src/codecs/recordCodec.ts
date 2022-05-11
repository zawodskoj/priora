import { Codec } from "../codec";
import { DecodingContext, EncodingContext } from "../context";
import { KeyCodec } from "../keyCodec";
import { surround } from "../contextual.stub";

export namespace RecordCodecImpl {
    function createUniversal<T, L, B>(
        kind: string,
        codec: Codec<T>,
        keyCodec: KeyCodec<L> | undefined,
        mkNew: () => B,
        set: (target: B, key: L, value: T) => void,
        ents: (u: B) => IterableIterator<[L, T]> | [L, T][]
    ): Codec<any> {
        const typename = `${kind}<${ keyCodec?.name ?? "string" }, ${ codec.name }>`;

        function decode(val: unknown, ctx: DecodingContext): any {
            if (typeof val !== "object" || val === null)
                return ctx.failure("Failed to decode object - object expected", val);

            const target = mkNew();

            surround(ctx, (enter) => {
                for (const [k, v] of Object.entries(val as object)) {
                    enter(typename + "." + k, k, () => {
                        const decodedKey = keyCodec?.decode(k, ctx) ?? (k as unknown as L);

                        set(target, decodedKey, codec.$decode(v, ctx));
                    })
                }
            })

            return target;
        }

        function encode(val: any, ctx: EncodingContext): unknown {
            const target = {} as Record<string, unknown>;

            surround(ctx, (enter) => {
                for (const [k, v] of ents(val)) {
                    // NOTE - no way to enter context before decoding key
                    // (at least keyCodec does not have contexts and should not throw on encoding)
                    const encodedKey = keyCodec?.encode(k as L) ?? (k as unknown as string);

                    enter(typename + "." + encodedKey, encodedKey, () => {
                        target[encodedKey] = codec.$encode(v as T, ctx);
                    })
                }
            })

            return target;
        }

        return Codec.make(typename, decode, encode);
    }

    export function create<T, L extends string>(codec: Codec<T>, keyCodec: KeyCodec<L> | undefined): Codec<Record<L, T>> {
        return createUniversal(
            "record",
            codec,
            keyCodec,
            () => ({} as Record<L, T>),
            (t, k, v) => { t[k] = v },
            u => Object.entries(u) as [L, T][]
        )
    }

    export function createMap<T, L>(codec: Codec<T>, keyCodec: KeyCodec<L> | undefined): Codec<Map<L, T>> {
        return createUniversal(
            "map",
            codec,
            keyCodec,
            () => new Map<L, T>(),
            (t, k, v) => { t.set(k, v) },
            u => u.entries()
        );
    }
}