<script lang="ts">
    import { apiFetch } from "$lib/api";
    import { playerStore } from "$lib/stores/player";
    import { playlistsStore } from "$lib/stores/playlists";
    import type { Music } from "$lib/types";

    interface Props {
        music: Music;
        playlistId?: string;
        onRemoved?: () => void;
    }

    let { music, playlistId, onRemoved }: Props = $props();

    let open = $state(false);
    let showPlaylistSubmenu = $state(false);

    function toggleOpen(e: Event) {
        e.stopPropagation();
        open = !open;
        if (open) playlistsStore.ensureLoaded();
    }

    function close() {
        open = false;
        showPlaylistSubmenu = false;
    }

    function handleAddToQueue() {
        playerStore.addToQueue(music);
        close();
    }

    function handlePlayNext() {
        playerStore.playNext(music);
        close();
    }

    async function handleAddToPlaylist(targetPlaylistId: string) {
        await apiFetch(`/playlists/${targetPlaylistId}`, {
            method: "POST",
            body: JSON.stringify({ songId: music.id }),
        });
        close();
    }

    async function handleRemove() {
        if (!playlistId) return;
        await apiFetch(`/playlists/${playlistId}/musics/${music.id}`, {
            method: "DELETE",
        });
        close();
        onRemoved?.();
    }
</script>

<svelte:window onclick={() => open && close()} />

<div class="relative">
    <button
        onclick={toggleOpen}
        class="rounded px-2 py-1 text-neutral-400 hover:bg-violet-100 hover:text-neutral-700"
    >
        <i class="bx bx-dots-vertical-rounded"></i>
    </button>

    {#if open}
        <div
            onclick={(e) => e.stopPropagation()}
            class="absolute right-0 top-8 z-50 flex w-48 flex-col gap-1 rounded-lg border border-violet-100 bg-white p-2 shadow-md"
        >
            <button
                onclick={handleAddToQueue}
                class="rounded px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-violet-100"
            >
                Add to queue
            </button>
            <button
                onclick={handlePlayNext}
                class="rounded px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-violet-100"
            >
                Play next
            </button>

            <div
                class="relative"
                onmouseenter={() => (showPlaylistSubmenu = true)}
                onmouseleave={() => (showPlaylistSubmenu = false)}
            >
                <button
                    class="w-full rounded px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-violet-100"
                >
                    Add to playlist ›
                </button>

                {#if showPlaylistSubmenu}
                    <div
                        class="absolute right-full top-0 flex max-h-64 w-48 flex-col gap-1 overflow-y-auto rounded-lg border border-violet-100 bg-white p-2 shadow-md"
                    >
                        {#each $playlistsStore as playlist}
                            <button
                                onclick={() => handleAddToPlaylist(playlist.id)}
                                class="truncate rounded px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-violet-100"
                            >
                                {playlist.name}
                            </button>
                        {:else}
                            <span class="px-2 py-1.5 text-sm text-neutral-400"
                                >No playlists</span
                            >
                        {/each}
                    </div>
                {/if}
            </div>

            {#if playlistId}
                <button
                    onclick={handleRemove}
                    class="rounded px-2 py-1.5 text-left text-sm text-red-500 hover:bg-red-50"
                >
                    Remove from playlist
                </button>
            {/if}
        </div>
    {/if}
</div>
