<script lang="ts">
    import { toastStore } from "$lib/stores/toast";
</script>

{#if $toastStore.length > 0}
    <div
        class="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2 md:bottom-6"
    >
        {#each $toastStore as toast (toast.id)}
            <div
                class="rounded-full bg-[var(--color-text-primary)] px-4 py-2 text-sm text-white shadow-lg"
            >
                {toast.message}
            </div>
        {/each}
    </div>
{/if}
