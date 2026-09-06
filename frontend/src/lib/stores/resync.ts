import { writable } from "svelte/store";
import { apiFetch } from "$lib/api";

interface ResyncState {
    running: boolean;
    processed: number;
    total: number;
}

function createResyncStore() {
    const { subscribe, set } = writable<ResyncState>({
        running: false,
        processed: 0,
        total: 0,
    });

    async function poll(jobId: string) {
        const job = await apiFetch<{
            status: string;
            processed?: number;
            total?: number;
        }>(`/library/resync/${jobId}`);
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
            const { jobId } = await apiFetch<{ jobId: string }>(
                "/library/resync",
                {
                    method: "POST",
                    body: JSON.stringify({ regenerateThumbnails: false }),
                },
            );
            set({ running: true, processed: 0, total: 0 });
            poll(jobId);
        },
    };
}

export const resyncStore = createResyncStore();
