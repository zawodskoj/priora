import { Suite } from "benchmark";
import { Codecs as C } from "../codecs";

const simpleObject = C.object("Simple object", {
    foo: C.string,
    bar: C.number,
    baz: C.boolean.opt
})

const bigObject = C.object("Big object", {
    field1: C.string,
    field2: C.string,
    field3: C.string,
    field4: C.string,
    field5: C.string,
    field6: C.string,
    field7: C.string,
    field8: C.string,
    field9: C.string,
    field10: C.string,
    field11: C.string,
    field12: C.string,
    field13: C.string,
    field14: C.string,
    field15: C.string,
    field16: C.string,
    field17: C.string,
    field18: C.string,
    field19: C.string,
    field20: C.string,
    field21: C.string,
    field22: C.string,
    field23: C.string,
    field24: C.string,
    field25: C.string,
    field26: C.string,
    field27: C.string,
    field28: C.string,
    field29: C.string,
    field30: C.string,
});

function mkCase(name: string) {
    return {
        ["case" + name + "field1"]: C.string,
        ["case" + name + "field2"]: C.string,
        ["case" + name + "field3"]: C.string,
        ["case" + name + "field4"]: C.string,
        ["case" + name + "field5"]: C.string,
        ["case" + name + "field6"]: C.string,
        ["case" + name + "field7"]: C.string,
        ["case" + name + "field8"]: C.string,
        ["case" + name + "field9"]: C.string,
        ["case" + name + "field10"]: C.string,
    }
}

const simpleCases = C.cases<"foo" | "bar" | "baz">("Simple cases")
    .withDiscriminator("type")
    .single("foo", { foo: C.string })
    .single("bar", { bar: C.number })
    .single("baz", { baz: C.boolean })
    .close();

const bigCases = C.cases<"case0" | "case1" | "case2" | "case3" | "case4" | "case5" | "case6" | "case7" | "case8" | "case9">("Big cases")
    .withDiscriminator("type")
    .single("case0", mkCase("0"))
    .single("case1", mkCase("1"))
    .single("case2", mkCase("2"))
    .single("case3", mkCase("3"))
    .single("case4", mkCase("4"))
    .single("case5", mkCase("5"))
    .single("case6", mkCase("6"))
    .single("case7", mkCase("7"))
    .single("case8", mkCase("8"))
    .single("case9", mkCase("9"))
    .close();

function createBigObject() {
    const obj: Record<string, string> = { };
    for (let i = 1; i <= 30; i++)
        obj["field" + i] = "123";

    return obj;
}

const constBigObject = createBigObject();

function createBigCasesObject() {
    const obj: Record<string, string> = { type: "case9" };
    for (let i = 1; i <= 10; i++)
        obj["case9field" + i] = "123";

    return obj;
}

const constBigCasesObject = createBigCasesObject();

new Suite()
    .add("Simple object", () => {
        simpleObject.decodeStrict({
            foo: "123",
            bar: 123
        })
    })
    .add("Simple object without tracing", () => {
        simpleObject._decodeStrictWithoutTracing({
            foo: "123",
            bar: 123
        })
    })
    .add("JSON roundtrip for big object", () => {
        JSON.parse(JSON.stringify(createBigObject()))
    })
    .add("JSON roundtrip for big object (const)", () => {
        JSON.parse(JSON.stringify(constBigObject))
    })
    .add("Big object", () => {
        bigObject.decodeStrict(createBigObject());
    })
    .add("Big object without tracing", () => {
        bigObject._decodeStrictWithoutTracing(createBigObject())
    })
    .add("Big object (with const object)", () => {
        bigObject.decodeStrict(constBigObject)
    })
    .add("Simple cases", () => {
        simpleCases.decodeStrict({ type: "baz", baz: false });
    })
    .add("Simple cases without tracing", () => {
        simpleCases._decodeStrictWithoutTracing({ type: "baz", baz: false });
    })
    .add("Big cases", () => {
        bigCases.decodeStrict(createBigCasesObject());
    })
    .add("Big cases without tracing", () => {
        bigCases._decodeStrictWithoutTracing(createBigCasesObject())
    })
    .add("Big cases (with const object)", () => {
        bigCases.decodeStrict(constBigCasesObject)
    })
    .on('cycle', function(event: any) {
        console.log(String(event.target));
    })
    .run();