import { Codecs as C } from "./codecs";
import { Codec } from "./codec";

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
    [123, { foo: "bar" }, false, new Date()]
);

primitiveCodec(
    C.number,
    [0, 123],
    ["123", { foo: "bar" }, false, new Date()]
);

primitiveCodec(
    C.boolean,
    [true, false],
    [0, 123, "123", { foo: "bar" }, new Date()]
);

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