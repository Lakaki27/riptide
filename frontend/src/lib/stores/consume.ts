import { writable } from "svelte/store";
import { apiFetch } from "$lib/api";

interface ConsumeState {
    running: boolean;
    processed: number;
    total: number;
}

function createConsumeStore() {
    const { subscribe, set } = writable<ConsumeState>({
        running: false,
        processed: 0,
        total: 0,
    });

    async function poll(jobId: string) {
        const job = await apiFetch<{
            status: string;
            processed?: number;
            total?: number;
        }>(`/library/consume/${jobId}`);
        if (job.status === "done" || job.status === "failed") {
            set({
                running: false,
                processed: job.total ?? 0,
                total: job.total ?? 0,
            });
            return;
        }
        set({
            running: true,
            processed: job.processed ?? 0,
            total: job.total ?? 0,
        });
        setTimeout(() => poll(jobId), 1000);
    }

    return {
        subscribe,
        async start() {
            const { jobId } = await apiFetch<{ jobId: string }>("/library/consume", {
                method: "POST",
            });
            set({ running: true, processed: 0, total: 0 });
            poll(jobId);
        },
    };
}

export const consumeStore = createConsumeStore();
