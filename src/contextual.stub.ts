import { TranscodingContext } from "./context";

export function enter(ctx: TranscodingContext, scope: string, path: string | number, f: () => void) {
    ctx.unsafeEnter(scope, path);

    try {
        f();
    } finally {
        ctx.unsafeLeave();
    }
}

type EnterFn =
    & ((scope: string, path: string | number, f: () => void) => void)
    & ((scope: string, f: () => void) => void)

export function surround(ctx: TranscodingContext, fn: (enter: EnterFn) => void) {
    fn((s: string, p: string | number | (() => void), f?: () => void) => {
        if (f) {
            ctx.unsafeEnter(s, p as string | number);

            try {
                f();
            } finally {
                ctx.unsafeLeave();
            }
        } else {
            ctx.unsafeEnter(s, undefined);

            try {
                (p as () => void)();
            } finally {
                ctx.unsafeLeave();
            }
        }
    })
}