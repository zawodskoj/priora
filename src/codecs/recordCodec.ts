import {Codec} from "../codec";
import {DecodingContext} from "../context";
import {KeyCodec} from "../keyCodec";

export namespace RecordCodecImpl {
    export function create<T, L extends string>(codec: Codec<T>, keyCodec: KeyCodec<L> | undefined, partial: boolean): Codec<Record<L, T>> {
        const typename = `record<${ keyCodec?.name ?? "string" }, ${ codec.name }>`;

        function decode(val: unknown, ctx: DecodingContext): Record<L, T> {
            if (typeof val !== "object")
                return ctx.failure("Failed to decode object - object expected", val);

            const target = {} as Record<L, T>;

            for (const [k, v] of Object.entries(val as object)) {
                if (!partial || v !== undefined) {
                    ctx.unsafeEnter(typename + "." + k, k);
                    try {
                        const decodedKey = keyCodec?.decode(k, ctx) ?? (k as L);

                        target[decodedKey] = codec.decode(v, ctx);
                    } finally {
                        ctx.unsafeLeave();
                    }
                }
            }

            return target;
        }

        function encode(val: Record<L, T>): unknown {
            const target = {} as Record<string, unknown>;

            for (const [k, v] of Object.entries(val)) {
                if (!partial || v !== undefined) {
                    const encodedKey = keyCodec?.encode(k as L) ?? k;

                    target[encodedKey] = codec.encode(v as T);
                }
            }

            return target;
        }

        return Codec.make(typename, decode, encode);
    }

    export function createMap<T, L>(codec: Codec<T>, keyCodec: KeyCodec<L> | undefined): Codec<Map<L, T>> {
        const typename = `record<${ keyCodec?.name ?? "string" }, ${ codec.name }>`;

        function decode(val: unknown, ctx: DecodingContext): Map<L, T> {
            if (typeof val !== "object")
                return ctx.failure("Failed to decode object - object expected", val);

            const target = new Map<L, T>();

            for (const [k, v] of Object.entries(val as object)) {
                ctx.unsafeEnter(typename + "." + k, k);
                try {
                    const decodedKey = keyCodec?.decode(k, ctx) ?? (k as unknown as L);

                    target.set(decodedKey, codec.decode(v, ctx));
                } finally {
                    ctx.unsafeLeave();
                }
            }

            return target;
        }

        function encode(val: Map<L, T>): unknown {
            const target = {} as Record<string, unknown>;

            for (const [k, v] of val.entries()) {
                const encodedKey = keyCodec?.encode(k as L) ?? (k as unknown as string);

                target[encodedKey] = codec.encode(v as T);
            }

            return target;
        }

        return Codec.make(typename, decode, encode);
    }
}