import { writable } from "svelte/store";

interface Toast {
    id: string;
    message: string;
}

function createToastStore() {
    const { subscribe, update } = writable<Toast[]>([]);

    return {
        subscribe,
        show(message: string) {
            const id = crypto.randomUUID();
            update((toasts) => [...toasts, { id, message }]);
            setTimeout(() => {
                update((toasts) => toasts.filter((t) => t.id !== id));
            }, 1800);
        },
    };
}

export const toastStore = createToastStore();
