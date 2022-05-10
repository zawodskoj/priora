import { Codec } from "../codec";
import { DecodingContext, EncodingContext } from "../context";
import { KeyCodec } from "../keyCodec";
import { surround } from "../contextual.stub";

export namespace RecordCodecImpl {
    export function create<T, L extends string>(codec: Codec<T>, keyCodec: KeyCodec<L> | undefined): Codec<Record<L, T>> {
        const typename = `record<${ keyCodec?.name ?? "string" }, ${ codec.name }>`;

        function decode(val: unknown, ctx: DecodingContext): Record<L, T> {
            if (typeof val !== "object" || val === null)
                return ctx.failure("Failed to decode object - object expected", val);

            const target = {} as Record<L, T>;

            surround(ctx, (enter) => {
                for (const [k, v] of Object.entries(val as object)) {
                    enter(typename + "." + k, k, () => {
                        const decodedKey = keyCodec?.decode(k, ctx) ?? (k as L);

                        target[decodedKey] = codec.$decode(v, ctx);
                    })
                }
            })

            return target;
        }

        function encode(val: Record<L, T>, ctx: EncodingContext): unknown {
            const target = {} as Record<string, unknown>;

            surround(ctx, (enter) => {
                for (const [k, v] of Object.entries(val)) {
                    enter(typename + "." + k, k, () => {
                        const encodedKey = keyCodec?.encode(k as L) ?? k;

                        target[encodedKey] = codec.$encode(v as T, ctx);
                    })
                }
            })

            return target;
        }

        return Codec.make(typename, decode, encode);
    }

    export function createMap<T, L>(codec: Codec<T>, keyCodec: KeyCodec<L> | undefined): Codec<Map<L, T>> {
        const typename = `record<${ keyCodec?.name ?? "string" }, ${ codec.name }>`;

        function decode(val: unknown, ctx: DecodingContext): Map<L, T> {
            if (typeof val !== "object" || val === null)
                return ctx.failure("Failed to decode object - object expected", val);

            const target = new Map<L, T>();

            surround(ctx, (enter) => {
                for (const [k, v] of Object.entries(val as object)) {
                    enter(typename + "." + k, k, () => {
                        const decodedKey = keyCodec?.decode(k, ctx) ?? (k as unknown as L);

                        target.set(decodedKey, codec.$decode(v, ctx));
                    })
                }
            })

            return target;
        }

        function encode(val: Map<L, T>, ctx: EncodingContext): unknown {
            const target = {} as Record<string, unknown>;

            surround(ctx, (enter) => {
                for (const [k, v] of val.entries()) {
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
}