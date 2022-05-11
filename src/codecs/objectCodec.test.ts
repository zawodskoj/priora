import { Codecs } from "./index";
import { CodecType } from "../codec";

const simple = Codecs.inline({ foo: Codecs.string, bar: Codecs.number });
const optional = Codecs.inline({ foo: Codecs.string, bar: Codecs.number.opt, baz: Codecs.boolean.orUndefined });
const withDefault = Codecs.inline({ foo: Codecs.string, qux: Codecs.number.orElse(123) });

describe("Object codec tests", () => {
    test("Infers into correct codec type", () => {
        type Compare<A, B> = A extends B ? B extends A ? true : false : false;

        interface Simple {
            foo: string
            bar: number
        }
        const isSimpleOk: Compare<Simple, CodecType<typeof simple>> = true;

        interface Optional {
            foo: string
            bar?: number
            baz: boolean | undefined
        }
        const isOptionalOk: Compare<Optional, CodecType<typeof optional>> = true;

        interface WithDefault {
            foo: string
            qux: number
        }
        const isWithDefaultOk: Compare<WithDefault, CodecType<typeof withDefault>> = true;
    })

    test("Does not decode invalid values", () => {
        // values of invalid types (non-objects)
        expect(() => simple.decodeStrict(123)).toThrow("Failed to decode object - object expected");
        expect(() => simple.decodeStrict("123")).toThrow("Failed to decode object - object expected");

        // missing fields
        expect(() => simple.decodeStrict({ })).toThrow("Missing property foo");
        expect(() => simple.decodeStrict({ foo: "123" })).toThrow("Missing property bar");
        expect(() => optional.decodeStrict({ foo: "123" })).toThrow("Missing property baz");
    })

    test("Does decode valid values", () => {
        expect(simple.decodeStrict({ foo: "123", bar: 123 })).toStrictEqual({ foo: "123", bar: 123 });

        expect(optional.decodeStrict({ foo: "123", bar: 123, baz: undefined })).toStrictEqual({ foo: "123", bar: 123, baz: undefined });
        expect(optional.decodeStrict({ foo: "123", baz: undefined })).toStrictEqual({ foo: "123", bar: undefined, baz: undefined });

        expect(withDefault.decodeStrict({ foo: "123", qux: 0 })).toStrictEqual({ foo: "123", qux: 0 });
        expect(withDefault.decodeStrict({ foo: "123" })).toStrictEqual({ foo: "123", qux: 123 });
    })

    // TODO: encoding tests
})