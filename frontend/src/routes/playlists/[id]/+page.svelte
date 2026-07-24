<script lang="ts">
import { onMount } from "svelte";
import { page } from "$app/state";
import { apiFetch } from "$lib/api";
import { playerStore } from "$lib/stores/player";
import type { Music, PaginatedResponse, Playlist } from "$lib/types";

const playlistId = page.params.id;

let playlist = $state<Playlist | null>(null);
let localQuery = $state("");
let showAddModal = $state(false);
let addQuery = $state("");
let addResults = $state<Music[]>([]);

const filteredMusics = $derived(
	playlist?.musics.filter((m) =>
		m.title.toLowerCase().includes(localQuery.toLowerCase()),
	) ?? [],
);

async function loadPlaylist() {
	playlist = await apiFetch<Playlist>(`/playlists/${playlistId}`);
}

async function removeSong(musicId: string) {
	await apiFetch(`/playlists/${playlistId}/musics/${musicId}`, {
		method: "DELETE",
	});
	await loadPlaylist();
}

async function searchToAdd() {
	if (!addQuery.trim()) {
		addResults = [];
		return;
	}
	const data = await apiFetch<PaginatedResponse<Music>>(
		`/search?type=music&q=${encodeURIComponent(addQuery)}`,
	);
	addResults = data.results;
}

async function addSong(musicId: string) {
	await apiFetch(`/playlists/${playlistId}`, {
		method: "POST",
		body: JSON.stringify({ songId: musicId }),
	});
	await loadPlaylist();
}

function playAll(startIndex = 0) {
	if (playlist) playerStore.setQueue(playlist.musics, startIndex);
}

onMount(loadPlaylist);
</script>

{#if playlist}
    <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
            <h1 class="text-xl text-neutral-900">{playlist.name}</h1>
            <div class="flex gap-2">
                <button
                    onclick={() => (showAddModal = true)}
                    class="rounded-lg border border-violet-100 px-3 py-2 text-sm text-neutral-500 hover:bg-violet-100"
                >
                    Add song
                </button>
                <button
                    onclick={() => playAll()}
                    class="rounded-lg bg-violet-500 px-3 py-2 text-sm text-white hover:bg-violet-600"
                >
                    Play all
                </button>
            </div>
        </div>

        <input
            bind:value={localQuery}
            placeholder="Search in this playlist"
            class="rounded-lg border border-violet-100 px-3 py-2 text-sm"
        />

        <div class="flex flex-col gap-1">
            {#each filteredMusics as music, i}
                <div class="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-violet-100">
                    <button
                        onclick={() => playAll(i)}
                        class="flex flex-1 items-center gap-3 text-left"
                    >
                        <img src={music.thumbnailUrl ?? "/placeholder.png"} alt="" class="h-10 w-10 rounded-lg" />
                        <div class="flex flex-col">
                            <span class="text-sm text-neutral-900">{music.title}</span>
                            <span class="text-sm text-neutral-500">{music.artist.name}</span>
                        </div>
                    </button>
                    <button
                        onclick={() => removeSong(music.id)}
                        class="text-sm text-neutral-500 hover:text-red-500"
                    >
                        Remove
                    </button>
                </div>
            {/each}
        </div>
    </div>
{/if}

{#if showAddModal}
    <div class="fixed inset-0 flex items-center justify-center bg-black/20">
        <div class="flex h-96 w-96 flex-col gap-3 rounded-lg bg-white p-6">
            <div class="flex items-center justify-between">
                <h2 class="text-lg text-neutral-900">Add song</h2>
                <button onclick={() => (showAddModal = false)} class="text-neutral-500">Close</button>
            </div>
            <input
                bind:value={addQuery}
                oninput={searchToAdd}
                placeholder="Search songs"
                class="rounded-lg border border-violet-100 px-3 py-2 text-sm"
            />
            <div class="flex flex-1 flex-col gap-1 overflow-y-auto">
                {#each addResults as music}
                    <button
                        onclick={() => addSong(music.id)}
                        class="flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-violet-100"
                    >
                        <img src={music.thumbnailUrl ?? "/placeholder.png"} alt="" class="h-10 w-10 rounded-lg" />
                        <div class="flex flex-col">
                            <span class="text-sm text-neutral-900">{music.title}</span>
                            <span class="text-sm text-neutral-500">{music.artist.name}</span>
                        </div>
                    </button>
                {/each}
            </div>
        </div>
    </div>
{/if}
