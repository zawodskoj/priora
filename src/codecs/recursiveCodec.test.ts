import { Codecs } from "./index";

describe("Recursive codec tests", () => {
    interface Recursive {
        optional?: string
        array: Recursive[]
    }

    const recursive = Codecs.recursive<Recursive>("rec")(c => ({
        optional: Codecs.string.opt,
        array: Codecs.array(c)
    }));

    test("Does not decode invalid values", () => {
        expect(() => recursive.decodeStrict(123)).toThrow("Failed to decode object - object expected");
        expect(() => recursive.decodeStrict("123")).toThrow("Failed to decode object - object expected");
        expect(() => recursive.decodeStrict({ })).toThrow("Missing property array");
    })

    test("Does decode valid values", () => {
        expect(recursive.decodeStrict({ array: [] })).toStrictEqual({ array: [], optional: undefined });
        expect(recursive.decodeStrict({ array: [{ array: [] }] })).toStrictEqual({ array: [{ array: [], optional: undefined }], optional: undefined });
        expect(recursive.decodeStrict({ optional: "123", array: [{ array: [] }] })).toStrictEqual({ array: [{ array: [], optional: undefined }], optional: "123" });
    })

    // TODO: encoding tests
})