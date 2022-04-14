import {CasesCodec} from "./casesCodec";
import {Codec} from "../codec";
import {Codecs} from "./index";

describe("CasesCodec2 tests", function () {
    test("Single empty case", () => {
        const codec = CasesCodec.make<"foo">("codec")
            .withDiscriminator("type")
            .empty("foo")
            .close();

        const good = { type: "foo" };
        expect(codec.encode(codec.decodeStrict(good))).toStrictEqual(good);
        expect(codec.decodeStrict(good).type).toBe("foo");

        // invalid case
        expect(() => codec.decodeStrict({ type: "bar" }))
            .toThrow("Failed to decode cases - none matched");
    })

    test("Single non-empty case", () => {
        const codec = CasesCodec.make<"foo">("codec")
            .withDiscriminator("type")
            .single("foo", { bar: Codecs.string })
            .close();

        const good = { type: "foo", bar: "123" };
        expect(codec.encode(codec.decodeStrict(good))).toStrictEqual(good);
        expect(codec.decodeStrict(good).bar).toBe("123");

        // missing fields
        expect(() => codec.decodeStrict({ type: "foo" })).toThrow();

        // invalid case
        expect(() => codec.decodeStrict({ type: "bar" }))
            .toThrow("Failed to decode cases - none matched");
    })

    test("Two cases case", () => {
        const codec = CasesCodec.make<"foo" | "bar">("codec")
            .withDiscriminator("type")
            .single("foo", { bar: Codecs.string })
            .empty("bar")
            .close();

        const good1 = { type: "foo", bar: "123" };
        const goodDecoded = codec.decodeStrict(good1);
        expect(codec.encode(goodDecoded)).toStrictEqual(good1);
        expect(goodDecoded.type === "foo" && goodDecoded.bar === "123").toBe(true);

        const good2 = { type: "bar" };
        expect(codec.encode(codec.decodeStrict(good2))).toStrictEqual(good2);
        expect(codec.decodeStrict(good2).type).toBe("bar");

        // missing fields
        expect(() => codec.decodeStrict({ type: "foo" })).toThrow();

        // invalid case
        expect(() => codec.decodeStrict({ type: "baz" }))
            .toThrow("Failed to decode cases - none matched");
    })

    test("Incomplete codec will not typecheck", () => {
        const codecBase = CasesCodec.make<"foo" | "bar">("codec")
            .withDiscriminator("type")
            .single("foo", { bar: Codecs.string });

        const badCodec = codecBase.close();
        const goodCodec = codecBase.empty("bar").close();

        const badTcheck: typeof badCodec extends never ? true : false = true;
        const goodTcheck: typeof goodCodec extends never ? true : false = false;

        expect(badTcheck).toBe(true);
        expect(goodTcheck).toBe(false);
    })

    test("Single case with base", () => {
        const codec = CasesCodec.make<"foo">("codec")
            .withDiscriminator("type")
            .base({ base: Codecs.number })
            .single("foo", { bar: Codecs.string })
            .close();

        const good = { type: "foo", bar: "123", base: 123 };
        expect(codec.encode(codec.decodeStrict(good))).toStrictEqual(good);
        expect(codec.decodeStrict(good).base).toBe(123);

        // missing fields
        expect(() => codec.decodeStrict({ type: "foo" })).toThrow();

        // missing base fields
        expect(() => codec.decodeStrict({ type: "foo", bar: "123" })).toThrow();

        // invalid case
        expect(() => codec.decodeStrict({ type: "bar" }))
            .toThrow("Failed to decode cases - none matched");
    })

    test("(Picked) single case with base", () => {
        const casesCodec = CasesCodec.make<"foo" | "bar">("codec")
            .withDiscriminator("type")
            .base({ base: Codecs.number })
            .single("foo", { bar: Codecs.string })
            .empty("bar")
            .close();

        const codec = casesCodec.pick("foo");
        const good = { type: "foo", bar: "123", base: 123 };
        const goodDecoded = codec.decodeStrict(good);
        expect(codec.encode(goodDecoded)).toStrictEqual(good);

        expect(goodDecoded.type).toBe("foo");
        expect(goodDecoded.base).toBe(123);
        expect(goodDecoded.bar).toBe("123");

        const goodAsPickedType: Codecs.PickCase<typeof casesCodec, "foo"> = goodDecoded
        expect(goodAsPickedType.type).toBe("foo");
        expect(goodAsPickedType.base).toBe(123);
        expect(goodAsPickedType.bar).toBe("123");

        // missing discriminator
        expect(() => codec.decodeStrict({ bar: "123", base: 123 })).toThrow();

        // missing fields
        expect(() => codec.decodeStrict({ type: "foo" })).toThrow();

        // missing base fields
        expect(() => codec.decodeStrict({ type: "foo", bar: "123" })).toThrow();
    })
});