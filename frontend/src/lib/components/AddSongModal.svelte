<script lang="ts">
    import { downloadsStore } from "$lib/stores/downloads";
    import { apiFetch } from "$lib/api";

    interface Props {
        onClose: () => void;
    }

    let { onClose }: Props = $props();

    let mode = $state<"url" | "file">("url");
    let url = $state("");
    let step = $state<"input" | "loading" | "review">("input");
    let previewTitle = $state("");
    let previewArtist = $state("");
    let previewThumbnail = $state<string | null>(null);
    let error = $state("");

    let selectedFiles = $state<File[]>([]);
    let uploading = $state(false);
    let isDragging = $state(false);
    let fileInputEl: HTMLInputElement;

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

    async function handleConfirmUrl() {
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

    function addFiles(fileList: FileList | File[]) {
        const incoming = Array.from(fileList).filter((f) =>
            f.type.startsWith("audio/"),
        );
        const existingKeys = new Set(
            selectedFiles.map((f) => `${f.name}-${f.size}`),
        );
        const deduped = incoming.filter(
            (f) => !existingKeys.has(`${f.name}-${f.size}`),
        );
        selectedFiles = [...selectedFiles, ...deduped];
    }

    function removeFile(index: number) {
        selectedFiles = selectedFiles.filter((_, i) => i !== index);
    }

    function formatSize(bytes: number): string {
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function onDragOver(e: DragEvent) {
        e.preventDefault();
        isDragging = true;
    }

    function onDragLeave(e: DragEvent) {
        e.preventDefault();
        isDragging = false;
    }

    function onDrop(e: DragEvent) {
        e.preventDefault();
        isDragging = false;
        if (e.dataTransfer?.files) {
            addFiles(e.dataTransfer.files);
        }
    }

    function onFileInputChange(e: Event) {
        const target = e.currentTarget as HTMLInputElement;
        if (target.files) {
            addFiles(target.files);
        }
        target.value = "";
    }

    async function handleFileUpload() {
        if (selectedFiles.length === 0) return;

        uploading = true;
        error = "";

        const formData = new FormData();
        for (const file of selectedFiles) {
            formData.append("files", file);
        }

        try {
            const { jobIds } = await apiFetch<{ jobIds: string[] }>(
                "/uploads",
                {
                    method: "POST",
                    body: formData,
                    skipJsonContentType: true,
                },
            );

            jobIds.forEach((jobId, i) =>
                downloadsStore.trackExisting(jobId, selectedFiles[i].name),
            );
            selectedFiles = [];
            onClose();
        } catch {
            error = "Upload failed";
        } finally {
            uploading = false;
        }
    }
</script>

<div class="fixed inset-0 flex items-center justify-center bg-black/20">
    <div
        class="flex w-96 flex-col gap-3 rounded-xl bg-[var(--color-surface)] p-6"
    >
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-1">
                <h2 class="text-lg text-[var(--color-text-primary)]">
                    Add music
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

        <div
            class="flex rounded-lg border border-[var(--color-border)] p-0.5 text-sm"
        >
            <button
                onclick={() => (mode = "url")}
                class="w-1/2 rounded px-2 py-1 {mode === 'url'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-text-muted)]'}"
            >
                From URL
            </button>
            <button
                onclick={() => (mode = "file")}
                class="w-1/2 rounded px-2 py-1 {mode === 'file'
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'text-[var(--color-text-muted)]'}"
            >
                Upload files
            </button>
        </div>

        {#if mode === "url"}
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
                            onclick={handleConfirmUrl}
                            class="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white hover:bg-[var(--color-accent-hover)]"
                        >
                            Start download
                        </button>
                    </div>
                </div>
            {/if}
        {:else}
            <div class="flex flex-col gap-3">
                <button
                    type="button"
                    onclick={() => fileInputEl.click()}
                    ondragover={onDragOver}
                    ondragleave={onDragLeave}
                    ondrop={onDrop}
                    class="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors {isDragging
                        ? 'border-[var(--color-accent)] bg-[var(--color-surface-hover)]'
                        : 'border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]'}"
                >
                    <i
                        class="bx bx-cloud-upload text-3xl text-[var(--color-text-muted)]"
                    ></i>
                    <span class="text-sm text-[var(--color-text-muted)]">
                        Drag audio files here, or click to browse
                    </span>
                </button>

                <input
                    bind:this={fileInputEl}
                    type="file"
                    accept="audio/*"
                    multiple
                    onchange={onFileInputChange}
                    class="hidden"
                />

                {#if selectedFiles.length > 0}
                    <div
                        class="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border border-[var(--color-border)] p-2"
                    >
                        {#each selectedFiles as file, i}
                            <div
                                class="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--color-surface-hover)]"
                            >
                                <i
                                    class="bx bx-music text-lg text-[var(--color-text-muted)]"
                                ></i>
                                <div class="flex min-w-0 flex-1 flex-col">
                                    <span
                                        class="truncate text-sm text-[var(--color-text-primary)]"
                                        >{file.name}</span
                                    >
                                    <span
                                        class="text-xs text-[var(--color-text-muted)]"
                                        >{formatSize(file.size)}</span
                                    >
                                </div>
                                <button
                                    onclick={() => removeFile(i)}
                                    class="text-[var(--color-text-muted)] hover:text-red-500"
                                >
                                    <i class="bx bx-x text-lg"></i>
                                </button>
                            </div>
                        {/each}
                    </div>
                {/if}

                {#if error}
                    <span class="text-sm text-red-500">{error}</span>
                {/if}

                <button
                    onclick={handleFileUpload}
                    disabled={uploading || selectedFiles.length === 0}
                    class="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
                >
                    {uploading
                        ? "Uploading..."
                        : `Upload ${selectedFiles.length || ""} file${selectedFiles.length === 1 ? "" : "s"}`}
                </button>
            </div>
        {/if}
    </div>
</div>
