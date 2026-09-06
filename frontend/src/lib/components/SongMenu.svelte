<script lang="ts">
    import { playerStore } from "$lib/stores/player";
    import { playlistsStore } from "$lib/stores/playlists";
    import { toastStore } from "$lib/stores/toast";
    import { apiFetch } from "$lib/api";
    import type { Music } from "$lib/types";

    interface Props {
        music: Music;
        playlistId?: string;
        onRemoved?: () => void;
    }

    let { music, playlistId, onRemoved }: Props = $props();

    let open = $state(false);
    let showPlaylistSubmenu = $state(false);
    let menuPosition = $state<{ top: number; left: number } | null>(null);
    let submenuPosition = $state<{ top: number; left: number } | null>(null);
    let triggerEl: HTMLElement;
    let playlistRowEl: HTMLElement;
    let submenuEl: HTMLElement;

    const MENU_WIDTH = 192;
    const SUBMENU_WIDTH = 208;

    function toggleOpen(e: Event) {
        e.stopPropagation();
        if (!open) {
            const rect = triggerEl.getBoundingClientRect();

            const leftAligned = rect.right - MENU_WIDTH;
            const left = leftAligned >= 8 ? leftAligned : rect.left;
            const clampedLeft = Math.min(
                left,
                window.innerWidth - MENU_WIDTH - 8,
            );

            menuPosition = {
                top: rect.bottom + 4,
                left: Math.max(8, clampedLeft),
            };
        }
        open = !open;
        showPlaylistSubmenu = false;
        if (open) playlistsStore.ensureLoaded();
    }

    function close() {
        open = false;
        showPlaylistSubmenu = false;
    }

    function handleAddToQueue() {
        playerStore.addToQueue(music);
        toastStore.show("Added to queue");
        close();
    }

    function handlePlayNext() {
        playerStore.playNext(music);
        toastStore.show("Playing next");
        close();
    }

    function togglePlaylistSubmenu(e: Event) {
        e.stopPropagation();

        if (!showPlaylistSubmenu) {
            const rect = playlistRowEl.getBoundingClientRect();
            const spaceRight = window.innerWidth - rect.right;
            const openRight = spaceRight >= SUBMENU_WIDTH;

            const left = openRight
                ? rect.right + 4
                : rect.left - SUBMENU_WIDTH - 4;

            const estimatedHeight = 220;
            const spaceBelow = window.innerHeight - rect.top;
            const top =
                spaceBelow >= estimatedHeight
                    ? rect.top
                    : Math.max(8, window.innerHeight - estimatedHeight - 8);

            submenuPosition = { top, left: Math.max(8, left) };
        }

        showPlaylistSubmenu = !showPlaylistSubmenu;
    }

    async function handleAddToPlaylist(
        targetPlaylistId: string,
        playlistName: string,
    ) {
        await apiFetch(`/playlists/${targetPlaylistId}`, {
            method: "POST",
            body: JSON.stringify({ songId: music.id }),
        });
        toastStore.show(`Added to ${playlistName}`);
        close();
    }

    async function handleRemove() {
        if (!playlistId) return;
        await apiFetch(`/playlists/${playlistId}/musics/${music.id}`, {
            method: "DELETE",
        });
        toastStore.show("Removed from playlist");
        close();
        onRemoved?.();
    }
</script>

<svelte:window onclick={() => open && close()} />

<div class="relative">
    <button
        bind:this={triggerEl}
        onclick={toggleOpen}
        class="rounded px-2 py-1 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
    >
        <i class="bx bx-dots-vertical-rounded"></i>
    </button>

    {#if open && menuPosition}
        <div
            onclick={(e) => e.stopPropagation()}
            style="position: fixed; top: {menuPosition.top}px; left: {menuPosition.left}px; width: {MENU_WIDTH}px;"
            class="z-50 flex flex-col gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-md"
        >
            <button
                onclick={handleAddToQueue}
                class="rounded px-2 py-1.5 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] active:scale-95"
            >
                Add to queue
            </button>
            <button
                onclick={handlePlayNext}
                class="rounded px-2 py-1.5 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] active:scale-95"
            >
                Play next
            </button>

            <button
                bind:this={playlistRowEl}
                onclick={togglePlaylistSubmenu}
                class="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm active:scale-95 {showPlaylistSubmenu
                    ? 'bg-[var(--color-surface-hover)] text-[var(--color-accent)]'
                    : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'}"
            >
                Add to playlist
                <i class="bx bx-chevron-right"></i>
            </button>

            {#if playlistId}
                <button
                    onclick={handleRemove}
                    class="rounded px-2 py-1.5 text-left text-sm text-red-500 hover:bg-red-50 active:scale-95"
                >
                    Remove from playlist
                </button>
            {/if}
        </div>
    {/if}

    {#if showPlaylistSubmenu && submenuPosition}
        <div
            bind:this={submenuEl}
            onclick={(e) => e.stopPropagation()}
            style="position: fixed; top: {submenuPosition.top}px; left: {submenuPosition.left}px; width: {SUBMENU_WIDTH}px;"
            class="z-50 flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2 shadow-lg"
        >
            {#each $playlistsStore as playlist}
                <button
                    onclick={() =>
                        handleAddToPlaylist(playlist.id, playlist.name)}
                    class="truncate rounded px-2 py-1.5 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] active:scale-95"
                >
                    {playlist.name}
                </button>
            {:else}
                <span class="px-2 py-1.5 text-sm text-[var(--color-text-muted)]"
                    >No playlists</span
                >
            {/each}
        </div>
    {/if}
</div>
