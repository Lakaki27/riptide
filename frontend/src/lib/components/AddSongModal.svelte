<script lang="ts">
    import { downloadsStore } from "$lib/stores/downloads";

    interface Props {
        onClose: () => void;
    }

    let { onClose }: Props = $props();

    let url = $state("");
    let submitting = $state(false);

    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (!url.trim() || submitting) return;

        submitting = true;
        try {
            await downloadsStore.start(url);
            onClose();
        } catch {
            submitting = false;
        }
    }
</script>

<div class="fixed inset-0 flex items-center justify-center bg-black/20">
    <div class="flex w-96 flex-col gap-3 rounded-lg bg-white p-6">
        <div class="flex items-center justify-between">
            <h2 class="text-lg text-neutral-900">Add from URL</h2>
            <button onclick={onClose} class="text-neutral-500">Close</button>
        </div>

        <form onsubmit={handleSubmit} class="flex flex-col gap-3">
            <input
                bind:value={url}
                placeholder="https://..."
                required
                class="rounded-lg border border-violet-100 px-3 py-2 text-sm"
            />
            <button
                type="submit"
                disabled={submitting}
                class="rounded-lg bg-violet-500 px-3 py-2 text-sm text-white hover:bg-violet-600 disabled:opacity-50"
            >
                {submitting ? "Starting..." : "Start download"}
            </button>
        </form>
    </div>
</div>
