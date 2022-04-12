import {Codecs as C} from "./codecs";
import {Codec} from "./codec";

export {};

function primitiveCodec(name: string, codec: Codec<any>, goodValues: unknown[], badValues: unknown[], excep: string) {
    describe(name + " codec", () => {
        test(`decodes ${name} values successfully`, () => {
            for (const gv of goodValues)
                expect(codec.decodeStrict(gv)).toBe(gv);
        })
        test("does not decode anything else", () => {
            for (const bv of badValues) {
                expect(() => {
                    codec.decodeStrict(bv);
                }).toThrow(excep);
            }
        });
    });
}

primitiveCodec("string", C.string,
    ["", "123"],
    [123, { foo: "bar" }, false, new Date()],
    "Failed to decode string - type mismatch"
);

primitiveCodec("number", C.number,
    [0, 123],
    ["123", { foo: "bar" }, false, new Date()],
    "Failed to decode number - type mismatch"
);

primitiveCodec("boolean", C.boolean,
    [true, false],
    [0, 123, "123", { foo: "bar" }, new Date()],
    "Failed to decode boolean - type mismatch"
);