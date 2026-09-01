import { writable } from "svelte/store";
import { apiFetch } from "$lib/api";

interface DownloadJob {
    id: string;
    url: string;
    status: "downloading" | "processing" | "uploading" | "done" | "failed";
    error?: string;
}

function createDownloadsStore() {
    const { subscribe, update } = writable<DownloadJob[]>([]);

    async function poll(jobId: string) {
        try {
            const job = await apiFetch<{ status: string; error?: string }>(
                `/downloads/${jobId}`,
            );

            update((jobs) =>
                jobs.map((j) =>
                    j.id === jobId
                        ? {
                              ...j,
                              status: job.status as DownloadJob["status"],
                              error: job.error,
                          }
                        : j,
                ),
            );

            if (job.status === "done" || job.status === "failed") {
                setTimeout(() => {
                    update((jobs) => jobs.filter((j) => j.id !== jobId));
                }, 4000);
                return;
            }

            setTimeout(() => poll(jobId), 1500);
        } catch {
            update((jobs) =>
                jobs.map((j) =>
                    j.id === jobId
                        ? { ...j, status: "failed", error: "lost connection" }
                        : j,
                ),
            );
        }
    }

    return {
        subscribe,
        async start(url: string) {
            const { jobId } = await apiFetch<{ jobId: string }>("/downloads", {
                method: "POST",
                body: JSON.stringify({ url }),
            });

            update((jobs) => [
                ...jobs,
                { id: jobId, url, status: "downloading" },
            ]);
            poll(jobId);
        },
        dismiss(jobId: string) {
            update((jobs) => jobs.filter((j) => j.id !== jobId));
        },
    };
}

export const downloadsStore = createDownloadsStore();
