import { TranscodingContext } from "./context";

export const contextualMacro = function(ctx: TranscodingContext, scope: string, path: string, f: () => void) {
    throw new Error("Attempted to use macro without macro-expansion");
};