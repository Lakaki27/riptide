import { m } from "$lib/paraglide/messages";

export function translateDynKey(key: string): string | false {
    const message = m[key as keyof typeof m];

    if (typeof message !== "function") {
        return false;
    }

    return (message as () => string)();
}
