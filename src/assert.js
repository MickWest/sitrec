export function assert(condition, message = false) {
    if (!condition) {
        console.trace()
        console.error("ASSERT: " + message);
        debugger;
    }
}