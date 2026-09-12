<script lang="ts">
import { onMount } from "svelte";
import { apiFetch } from "$lib/api";
import { m } from "$lib/paraglide/messages";
import { authStore } from "$lib/stores/auth";
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
        <h1 class="text-xl text-(--color-text-primary)">
            {m["nav.playlists"]()}
        </h1>
        {#if $authStore.role === "admin"}
            <button
                onclick={() => (showCreateModal = true)}
                class="rounded-lg bg-(--color-accent) px-3 py-2 text-sm text-white hover:bg-(--color-accent-hover)"
            >
                {m["new_playlist"]()}
            </button>
        {/if}
    </div>

    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4">
        {#each playlists as playlist}
            <a
                href="/playlists/{playlist.id}"
                class="flex flex-col gap-2 rounded-xl bg-(--color-surface) p-3 shadow-sm transition-shadow hover:bg-(--color-violet-pale) hover:shadow-md md:p-4"
            >
                <div
                    class="flex h-20 items-center justify-center rounded-xl bg-(--color-violet-pale) text-(--color-accent) md:h-24"
                >
                    {playlist.name.slice(0, 1).toUpperCase()}
                </div>
                <span class="truncate text-sm text-(--color-text-primary)"
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
            class="flex w-80 flex-col gap-3 rounded-lg bg-(--color-surface) p-6"
        >
            <h2 class="text-lg text-(--color-text-primary)">
                {m["new_playlist"]()}
            </h2>
            <input
                bind:value={newPlaylistName}
                placeholder={m["playlist_name"]()}
                required
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-gray-400"
            />
            <div class="flex justify-end gap-2">
                <button
                    type="button"
                    onclick={() => (showCreateModal = false)}
                    class="rounded-lg px-3 py-2 text-sm text-(--color-text-muted) hover:bg-(--color-violet-pale)"
                >
                    {m["cancel"]()}
                </button>
                <button
                    type="submit"
                    class="rounded-lg bg-(--color-accent) px-3 py-2 text-sm text-white hover:bg-(--color-accent-hover)"
                >
                    {m["create"]()}
                </button>
            </div>
        </form>
    </div>
{/if}
