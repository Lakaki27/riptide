import { m } from "$lib/paraglide/messages";

export function translateDynKey(key: string): string {
    const message = m[key as keyof typeof m];

    if (typeof message !== "function") {
        return "";
    }

    return (message as () => string)();
}
