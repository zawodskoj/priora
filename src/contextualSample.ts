import { contextualMacro } from "./contextual.macro";

function asd() {
    const ctx = "TODO";

    console.log("outer 1");

    contextualMacro(ctx, "sample scope", "sample path", () => {
        console.log("inner");
    })

    console.log("outer 2");
}