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

    async function poll(jobId: string, retriesLeft = 3) {
        try {
            const job = await apiFetch<{ status: string; error?: string }>(`/downloads/${jobId}`);

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

            setTimeout(() => poll(jobId, 3), 1500);
        } catch {
            if (retriesLeft > 0) {
                setTimeout(() => poll(jobId, retriesLeft - 1), 1500);
                return;
            }
            update((jobs) =>
                jobs.map((j) =>
                    j.id === jobId ? { ...j, status: "failed", error: "lost connection" } : j,
                ),
            );
        }
    }

    return {
        subscribe,
        async start(url: string, overrides?: { title?: string; artist?: string }) {
            const { jobId } = await apiFetch<{ jobId: string }>("/downloads", {
                method: "POST",
                body: JSON.stringify({ url, ...overrides }),
            });
            update((jobs) => [...jobs, { id: jobId, url, status: "downloading" }]);
            poll(jobId);
        },
        dismiss(jobId: string) {
            update((jobs) => jobs.filter((j) => j.id !== jobId));
        },
        trackExisting(jobId: string, label: string) {
            update((jobs) => [...jobs, { id: jobId, url: label, status: "downloading" }]);
            poll(jobId);
        },
    };
}

export const downloadsStore = createDownloadsStore();
