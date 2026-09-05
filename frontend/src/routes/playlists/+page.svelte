<script lang="ts">
    import { onMount } from "svelte";
    import { apiFetch } from "$lib/api";
    import type { Playlist } from "$lib/types";

    let playlists = $state<Playlist[]>([]);
    let showCreateModal = $state(false);
    let newPlaylistName = $state("");

    async function loadPlaylists() {
        playlists = await apiFetch<Playlist[]>("/playlists");
    }

    async function createPlaylist(e: Event) {
        e.preventDefault();
        if (!newPlaylistName.trim()) return;

        await apiFetch("/playlists", {
            method: "POST",
            body: JSON.stringify({ name: newPlaylistName }),
        });

        newPlaylistName = "";
        showCreateModal = false;
        await loadPlaylists();
    }

    onMount(loadPlaylists);
</script>

<div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
        <h1 class="text-xl text-neutral-900">Playlists</h1>
        <button
            onclick={() => (showCreateModal = true)}
            class="rounded-lg bg-violet-500 px-3 py-2 text-sm text-white hover:bg-violet-600"
        >
            New playlist
        </button>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
        {#each playlists as playlist}
            <a
                href="/playlists/{playlist.id}"
                class="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm transition-shadow hover:bg-violet-100 hover:shadow-md md:p-4"
            >
                <div
                    class="flex h-20 items-center justify-center rounded-xl bg-violet-100 text-violet-500 md:h-24"
                >
                    {playlist.name.slice(0, 1).toUpperCase()}
                </div>
                <span class="truncate text-sm text-neutral-900"
                    >{playlist.name}</span
                >
            </a>
        {/each}
    </div>
</div>

{#if showCreateModal}
    <div class="fixed inset-0 flex items-center justify-center bg-black/20">
        <form
            onsubmit={createPlaylist}
            class="flex w-80 flex-col gap-3 rounded-lg bg-white p-6"
        >
            <h2 class="text-lg text-neutral-900">New playlist</h2>
            <input
                bind:value={newPlaylistName}
                placeholder="Playlist name"
                required
                class="rounded-lg border border-violet-100 px-3 py-2 text-sm"
            />
            <div class="flex justify-end gap-2">
                <button
                    type="button"
                    onclick={() => (showCreateModal = false)}
                    class="rounded-lg px-3 py-2 text-sm text-neutral-500 hover:bg-violet-100"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    class="rounded-lg bg-violet-500 px-3 py-2 text-sm text-white hover:bg-violet-600"
                >
                    Create
                </button>
            </div>
        </form>
    </div>
{/if}
