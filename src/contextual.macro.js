// const {createMacro} = require('babel-plugin-macros')
//
// // `createMacro` is simply a function that ensures your macro is only
// // called in the context of a babel transpilation and will throw an
// // error with a helpful message if someone does not have babel-plugin-macros
// // configured correctly
// module.exports = createMacro(myMacro)
//
// function myMacro({references, state, babel: { types: t }}) {
//     console.log("we in macro yay");
//
//     const call = references.contextualMacro[0].parentPath;
//     const ctx = call.get("arguments")[0].node;
//     const scope = call.get("arguments")[1].node;
//     const path = call.get("arguments")[2].node;
//     const action = call.get("arguments")[3].node;
//     if (action.type === "ArrowFunctionExpression") {
//         const body = action.body;
//
//         const isTracingEnabled = t.memberExpression(ctx, t.identifier("isTracingEnabled"));
//         const enterContext = t.expressionStatement(
//             t.callExpression(
//                 t.memberExpression(ctx, t.identifier("unsafeEnter")),
//                 [
//                     scope,
//                     path
//                 ]
//             )
//         )
//         const leaveContext = t.expressionStatement(
//             t.callExpression(
//                 t.memberExpression(ctx, t.identifier("unsafeLeave")),
//                 []
//             )
//         )
//         const contextualBody = t.blockStatement([
//             enterContext,
//             t.tryStatement(
//                 body,
//                 null,
//                 t.blockStatement([leaveContext])
//             )
//         ])
//
//         const newBody = t.ifStatement(isTracingEnabled, contextualBody, body);
//
//         call.parentPath.replaceWith(newBody);
//     } else {
//         console.log("misused macro i think")
//     }
// }