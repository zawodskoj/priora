import { Codecs as C } from ".";
import { Codec } from "../codec";

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

describe("Primitive codecs", () => {
    primitiveCodec(
        C.string,
        ["", "123"],
        [123, {foo: "bar"}, false]
    );

    primitiveCodec(
        C.number,
        [0, 123],
        ["123", {foo: "bar"}, false]
    );

    primitiveCodec(
        C.boolean,
        [true, false],
        [0, 123, "123", {foo: "bar"}]
    );
});