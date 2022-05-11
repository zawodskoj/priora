import { Codecs } from "./index";

describe("Record codec tests", () => {
    const simple = Codecs.record(Codecs.number);
    const upperKeys = Codecs.record(Codecs.number, Codecs.stringKey.imap<string>(v => v.toLowerCase(), v => v.toUpperCase(), undefined));

    test("Does not decode invalid values", () => {
        expect(() => simple.decodeStrict(123)).toThrow("Failed to decode object - object expected");
        expect(() => simple.decodeStrict("123")).toThrow("Failed to decode object - object expected");

        expect(() => upperKeys.decodeStrict(123)).toThrow("Failed to decode object - object expected");
        expect(() => upperKeys.decodeStrict("123")).toThrow("Failed to decode object - object expected");
    })

    test("Does decode valid values", () => {
        expect(simple.decodeStrict({ })).toStrictEqual({ });
        expect(simple.decodeStrict({ a: 1 })).toStrictEqual({ a: 1 });
        expect(simple.decodeStrict({ a: 1, b: 2, c: 3 })).toStrictEqual({ a: 1, b: 2, c: 3 });

        expect(upperKeys.decodeStrict({ })).toStrictEqual({ });
        expect(upperKeys.decodeStrict({ A: 1 })).toStrictEqual({ a: 1 });
        expect(upperKeys.decodeStrict({ A: 1, B: 2, C: 3 })).toStrictEqual({ a: 1, b: 2, c: 3 });
    })

    // TODO: encoding tests for invalid values

    test("Does encode valid values", () => {
        expect(simple.encode({ })).toStrictEqual({ });
        expect(simple.encode({ a: 1 })).toStrictEqual({ a: 1 });
        expect(simple.encode({ a: 1, b: 2, c: 3 })).toStrictEqual({ a: 1, b: 2, c: 3 });

        expect(upperKeys.encode({ })).toStrictEqual({ });
        expect(upperKeys.encode({ a: 1 })).toStrictEqual({ A: 1 });
        expect(upperKeys.encode({ a: 1, b: 2, c: 3 })).toStrictEqual({ A: 1, B: 2, C: 3 });
    })
})

describe("Map codec tests", () => {
    const simple = Codecs.map(Codecs.number);
    const upperKeys = Codecs.map(Codecs.number, Codecs.stringKey.imap<string>(v => v.toLowerCase(), v => v.toUpperCase(), undefined));

    test("Does not decode invalid values", () => {
        expect(() => simple.decodeStrict(123)).toThrow("Failed to decode object - object expected");
        expect(() => simple.decodeStrict("123")).toThrow("Failed to decode object - object expected");

        expect(() => upperKeys.decodeStrict(123)).toThrow("Failed to decode object - object expected");
        expect(() => upperKeys.decodeStrict("123")).toThrow("Failed to decode object - object expected");
    })

    test("Does decode valid values", () => {
        expect(simple.decodeStrict({ })).toStrictEqual(new Map());
        expect(simple.decodeStrict({ a: 1 })).toStrictEqual(new Map([["a", 1]]));
        expect(simple.decodeStrict({ a: 1, b: 2, c: 3 })).toStrictEqual(new Map([["a", 1], ["b", 2], ["c", 3]]));

        expect(upperKeys.decodeStrict({ })).toStrictEqual(new Map());
        expect(upperKeys.decodeStrict({ A: 1 })).toStrictEqual(new Map([["a", 1]]));
        expect(upperKeys.decodeStrict({ A: 1, B: 2, C: 3 })).toStrictEqual(new Map([["a", 1], ["b", 2], ["c", 3]]));
    })

    // TODO: encoding tests for invalid values

    test("Does encode valid values", () => {
        expect(simple.encode(new Map())).toStrictEqual({ });
        expect(simple.encode(new Map([["a", 1]]))).toStrictEqual({ a: 1 });
        expect(simple.encode(new Map([["a", 1], ["b", 2], ["c", 3]]))).toStrictEqual({ a: 1, b: 2, c: 3 });

        expect(upperKeys.encode(new Map())).toStrictEqual({ });
        expect(upperKeys.encode(new Map([["a", 1]]))).toStrictEqual({ A: 1 });
        expect(upperKeys.encode(new Map([["a", 1], ["b", 2], ["c", 3]]))).toStrictEqual({ A: 1, B: 2, C: 3 });
    })
})