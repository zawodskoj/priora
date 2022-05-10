import { Codecs as C } from "./codecs";
import { Codec, CodecType } from "./codec";
import { RecursiveCodecImpl } from "./codecs/recursiveCodec";

export {};

function primitiveCodec(codec: Codec<any>, goodValues: unknown[], badValues: unknown[]) {
    describe(codec.name + " codec", () => {
        test(`decodes ${codec.name} values successfully`, () => {
            for (const gv of goodValues)
                expect(codec.decodeStrict(gv)).toBe(gv);
        })
        test("does not decode anything else", () => {
            for (const bv of badValues) {
                expect(() => {
                    codec.decodeStrict(bv);
                }).toThrow(`Failed to decode ${codec.name} - type mismatch`);
            }
        });
    });
}

primitiveCodec(
    C.string,
    ["", "123"],
    [123, { foo: "bar" }, false]
);

primitiveCodec(
    C.number,
    [0, 123],
    ["123", { foo: "bar" }, false]
);

primitiveCodec(
    C.boolean,
    [true, false],
    [0, 123, "123", { foo: "bar" }]
);

test("optionals", () => {
    const codec = C.object("test", {
        foo: C.string,
        bar: C.string.orNull,
        baz: C.string.opt,
        qux: C.string.orUndefined
    });

    type CType = CodecType<typeof codec>;
    const a: CType = {
        foo: "",
        bar: null,
        baz: "",
        qux: undefined
    }

    const b: CType = {
        foo: "",
        bar: null,
        qux: ""
    }

    const realA: { foo: string, bar: string | null, baz?: string | undefined } = a;
    const realB: { foo: string, bar: string | null, baz?: string | undefined } = b;
})

test("recursives and optionals", () => {
    interface RecType {
        foo: string
        bar?: string
        baz?: RecType[]
        qux: string | undefined
    }

    const codec = C.recursive<RecType>("test")(self => ({
        foo: C.string,
        bar: C.string.optional,
        baz: C.array(self).optional,
        qux: C.string.orUndefined,
    }));
})

test("orElse", () => {
    const codec = C.object("test", {
        foo: C.string,
        bar: C.string.orElse("test 1"),
        baz: C.string.orElseLazy(() => "test 2")
    });

    expect(codec.decodeStrict({
        foo: "123"
    })).toStrictEqual({ foo: "123", bar: "test 1", baz: "test 2" })
})

test("encode/decode in field-checking mode", () => {
    const codec1 = C.inline({ foo: C.string })
    const codec2 = C.inline({ foo: C.string.opt })

    expect(() => codec1.decodeStrict({ })).toThrow("Missing property foo");
    expect(codec2.decodeStrict({ })).toStrictEqual({ foo: undefined });

    expect(() => codec1.encode({ } as { foo: string })).toThrow("Missing property foo");
    expect(() => codec1.encode({ foo: undefined! })).toThrow("Failed to encode string - type mismatch");
    expect(codec1.encode({ foo: "foo" })).toStrictEqual({ foo: "foo" });
    expect(codec2.encode({ foo: undefined! })).toStrictEqual({ foo: undefined });
    expect(codec2.encode({ foo: "foo" })).toStrictEqual({ foo: "foo" });
})

/*

test("kek", () => {
    const cases = C.cases("cases", "type", {
        foo: { foo: C.string },
        bar: { bar: C.number },
        qux: { qux: C.boolean },
    })

    type Cases = CodecType<typeof cases>;
    type CasesK = "foo" | "bar" | "qux";
    type CasesOG<T extends CasesK = CasesK> = Cases & { type: T };
    type CasesG<T extends CasesK = CasesK> = PickCase<typeof cases, T>;

    function a(c: Cases) {
        if (c.type === "bar") {
            void c.bar
        }
    }

    function b(c: CasesOG) {
        if (c.type === "bar") {
            void c.bar
        }
    }

    function c(c: CasesG) {
        if (c.type === "bar") {
            void c.bar
        }
    }

    function d<T extends "bar">(t: T, c: CasesG): CasesG<T> {
        if (c.type === "bar") {
            if (t === "bar") {
                return c;
            }
        }
    }

    d<never>("" as never, null as unknown as CasesG);
})
*/