import { Codecs } from "./index";
import { CodecType } from "../codec";

// todo optionals?

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
    const tuple7 = Codecs.tuple([Codecs.number, Codecs.string, Codecs.number, Codecs.string, Codecs.number, Codecs.string, Codecs.number]);

    const optTuple2 = Codecs.tuple([Codecs.number, Codecs.string.opt]);
    const optTuple3 = Codecs.tuple([Codecs.number, Codecs.string.opt, Codecs.number.opt]);
    const cancelOptTuple3 = Codecs.tuple([Codecs.number, Codecs.string.opt, Codecs.number]);

    test("Infers into correct codec type", () => {
        type Compare<A, B> = A extends B ? B extends A ? true : false : false;

        const isTuple1Ok: Compare<[number], CodecType<typeof tuple1>> = true;
        const isTuple2Ok: Compare<[number, string], CodecType<typeof tuple2>> = true;
        const isTuple7Ok: Compare<[number, string, number, string, number, string, number], CodecType<typeof tuple7>> = true;

        const isOptTuple2Ok: Compare<[number, string?], CodecType<typeof optTuple2>> = true;
        const isOptTuple3Ok: Compare<[number, string?, number?], CodecType<typeof optTuple3>> = true;
        const isCancelOptTuple3Ok: Compare<[number, string | undefined, number], CodecType<typeof cancelOptTuple3>> = true;
    })

    test("Does not decode invalid values", () => {
        expect(() => tuple1.decodeStrict(123)).toThrow("Failed to decode tuple - array expected");
        expect(() => tuple1.decodeStrict("123")).toThrow("Failed to decode tuple - array expected");
    })

    test("Does not decode arrays with mismatching size", () => {
        expect(() => tuple1.decodeStrict([])).toThrow("Failed to decode tuple - wrong element count");
        expect(() => tuple1.decodeStrict([1, 2])).toThrow("Failed to decode tuple - wrong element count");

        expect(() => optTuple2.decodeStrict([])).toThrow("Failed to decode tuple - wrong element count");

        expect(() => cancelOptTuple3.decodeStrict([1])).toThrow("Failed to decode tuple - wrong element count");
        expect(() => cancelOptTuple3.decodeStrict([1, "2"])).toThrow("Failed to decode tuple - wrong element count");
    })

    test("Does decode valid values", () => {
        expect(tuple1.decodeStrict([1])).toStrictEqual([1]);
        expect(tuple2.decodeStrict([1, "1"])).toStrictEqual([1, "1"]);

        expect(optTuple2.decodeStrict([1])).toStrictEqual([1, undefined]);
        expect(optTuple2.decodeStrict([1, "2"])).toStrictEqual([1, "2"]);

        expect(optTuple3.decodeStrict([1])).toStrictEqual([1, undefined, undefined]);
        expect(optTuple3.decodeStrict([1, "2"])).toStrictEqual([1, "2", undefined]);
        expect(optTuple3.decodeStrict([1, undefined, 3])).toStrictEqual([1, undefined, 3]);

        expect(cancelOptTuple3.decodeStrict([1, undefined, 3])).toStrictEqual([1, undefined, 3]);
    })

    // TODO: encode tests
})