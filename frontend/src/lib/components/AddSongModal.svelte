<script lang="ts">
    import { downloadsStore } from "$lib/stores/downloads";
    import { apiFetch } from "$lib/api";

    interface Props {
        onClose: () => void;
    }

    let { onClose }: Props = $props();

    let url = $state("");
    let step = $state<"input" | "loading" | "review">("input");
    let previewTitle = $state("");
    let previewArtist = $state("");
    let previewThumbnail = $state<string | null>(null);
    let error = $state("");

    async function handleUrlSubmit(e: Event) {
        e.preventDefault();
        if (!url.trim()) return;

        step = "loading";
        error = "";

        try {
            const preview = await apiFetch<{
                title: string;
                artist: string;
                thumbnailUrl: string | null;
            }>("/downloads/preview", {
                method: "POST",
                body: JSON.stringify({ url }),
            });
            previewTitle = preview.title;
            previewArtist = preview.artist;
            previewThumbnail = preview.thumbnailUrl;
            step = "review";
        } catch {
            error = "Could not fetch video info";
            step = "input";
        }
    }

    async function handleConfirm() {
        try {
            await downloadsStore.start(url, {
                title: previewTitle,
                artist: previewArtist,
            });
            onClose();
        } catch {
            error = "Could not start download";
        }
    }
</script>

<div class="fixed inset-0 flex items-center justify-center bg-black/20">
    <div
        class="flex w-96 flex-col gap-3 rounded-xl bg-[var(--color-surface)] p-6"
    >
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <h2 class="text-lg text-[var(--color-text-primary)]">
                    Add from URL
                </h2>
                <div class="group relative">
                    <button
                        onclick={() =>
                            window.open(
                                "/legal",
                                "_blank",
                                "noopener,noreferrer",
                            )}
                        class="flex h-5 w-5 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                    >
                        <i class="bx bx-info-circle text-base"></i>
                    </button>
                    <div
                        class="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[var(--color-text-primary)] px-2 py-1 text-xs text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                    >
                        View legal disclaimer
                    </div>
                </div>
            </div>
            <button onclick={onClose} class="text-[var(--color-text-muted)]"
                >Close</button
            >
        </div>

        {#if step === "input"}
            <form onsubmit={handleUrlSubmit} class="flex flex-col gap-3">
                <input
                    bind:value={url}
                    placeholder="https://..."
                    required
                    class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
                />
                {#if error}
                    <span class="text-sm text-red-500">{error}</span>
                {/if}
                <button
                    type="submit"
                    class="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white hover:bg-[var(--color-accent-hover)]"
                >
                    Fetch info
                </button>
            </form>
        {:else if step === "loading"}
            <div class="flex h-40 items-center justify-center">
                <div
                    class="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border)] border-t-[var(--color-accent)]"
                ></div>
            </div>
        {:else if step === "review"}
            <div class="flex flex-col gap-3">
                {#if previewThumbnail}
                    <img
                        src={previewThumbnail}
                        alt=""
                        class="h-32 w-full rounded-lg object-cover"
                    />
                {/if}

                <label
                    class="flex flex-col gap-1 text-sm text-[var(--color-text-muted)]"
                >
                    Title
                    <input
                        bind:value={previewTitle}
                        class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                    />
                </label>

                <label
                    class="flex flex-col gap-1 text-sm text-[var(--color-text-muted)]"
                >
                    Artist
                    <input
                        bind:value={previewArtist}
                        class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)]"
                    />
                </label>

                {#if error}
                    <span class="text-sm text-red-500">{error}</span>
                {/if}

                <div class="flex justify-end gap-2">
                    <button
                        onclick={() => (step = "input")}
                        class="rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                    >
                        Back
                    </button>
                    <button
                        onclick={handleConfirm}
                        class="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white hover:bg-[var(--color-accent-hover)]"
                    >
                        Start download
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>
