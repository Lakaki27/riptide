<script lang="ts">
    import { m } from "$lib/paraglide/messages";
    import { downloadsStore } from "$lib/stores/downloads";
    import { translateDynKey } from "$lib/utils/translateDynKey";

    function statusLabel(status: string): string {
        return translateDynKey(`status_labels.${status}`) || status;
    }
</script>

{#if $downloadsStore.length > 0}
    <div class="fixed bottom-20 right-6 flex flex-col gap-2 z-50">
        {#each $downloadsStore as job (job.id)}
            <div
                class="flex w-72 items-center gap-3 rounded-lg bg-[var(--color-surface)] p-3 shadow-md"
            >
                <div class="flex flex-1 flex-col">
                    <span
                        class="truncate text-sm text-[var(--color-text-primary)]"
                        >{job.url}</span
                    >
                    <span
                        class="text-sm {job.status === 'failed'
                            ? 'text-red-500'
                            : 'text-[var(--color-text-muted)]'}"
                    >
                        {statusLabel(job.status)}{job.error
                            ? `: ${job.error}`
                            : ""}
                    </span>
                </div>
                {#if job.status !== "done" && job.status !== "failed"}
                    <div
                        class="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-violet-pale)] border-t-[var(--color-accent)]"
                    ></div>
                {:else}
                    <button
                        onclick={() => downloadsStore.dismiss(job.id)}
                        class="text-gray-400 hover:text-gray-600"
                    >
                        ✕
                    </button>
                {/if}
            </div>
        {/each}
    </div>
{/if}
