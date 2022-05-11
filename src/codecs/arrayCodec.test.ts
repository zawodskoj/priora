import { Codecs } from "./index";

describe("Array codec tests", () => {
    const numbers = Codecs.array(Codecs.number);

    test("Does not decode invalid values", () => {
        expect(() => numbers.decodeStrict(123)).toThrow("Failed to decode array - array expected");
        expect(() => numbers.decodeStrict("123")).toThrow("Failed to decode array - array expected");
    })

    test("Does decode valid values", () => {
        expect(numbers.decodeStrict([])).toStrictEqual([]);
        expect(numbers.decodeStrict([1])).toStrictEqual([1]);
        expect(numbers.decodeStrict([1, 2, 3, 4])).toStrictEqual([1, 2, 3, 4]);
    })

    // TODO: encoding tests
})

describe("Tuple codec tests", () => {
    const tuple1 = Codecs.tuple([Codecs.number]);
    const tuple2 = Codecs.tuple([Codecs.number, Codecs.string]);

    test("Does not decode invalid values", () => {
        expect(() => tuple1.decodeStrict(123)).toThrow("Failed to decode tuple - array expected");
        expect(() => tuple1.decodeStrict("123")).toThrow("Failed to decode tuple - array expected");
    })

    test("Does not decode arrays with mismatching size", () => {
        expect(() => tuple1.decodeStrict([])).toThrow("Failed to decode tuple - wrong element count");
        expect(() => tuple1.decodeStrict([1, 2])).toThrow("Failed to decode tuple - wrong element count");
    })

    test("Does decode valid values", () => {
        expect(tuple1.decodeStrict([1])).toStrictEqual([1]);
        expect(tuple2.decodeStrict([1, "1"])).toStrictEqual([1, "1"]);
    })

    // TODO: encode tests
})