<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { apiFetch } from "$lib/api";
    import MusicList from "$lib/components/MusicList.svelte";
    import { m } from "$lib/paraglide/messages";
    import { playerStore } from "$lib/stores/player";
    import type { Music, Playlist } from "$lib/types";

    const MAX_QUERY_LENGTH = 100;

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

    const playlistMusicIds = $derived(
        new Set(playlist?.musics.map((m) => m.id) ?? []),
    );
    const visibleAddResults = $derived(
        addResults.filter((m) => !playlistMusicIds.has(m.id)),
    );

    async function loadPlaylist() {
        playlist = await apiFetch<Playlist>(`/playlists/${playlistId}`);
    }

    async function searchToAdd() {
        if (!addQuery.trim()) {
            addResults = [];
            return;
        }
        addResults = await apiFetch<Music[]>(
            `/search?type=music&q=${encodeURIComponent(addQuery)}`,
        );
    }

    async function addSong(musicId: string) {
        await apiFetch(`/playlists/${playlistId}`, {
            method: "POST",
            body: JSON.stringify({ songId: musicId }),
        });
        await loadPlaylist();
    }

    function playAll() {
        if (playlist) playerStore.setQueue(playlist.musics, 0);
    }

    onMount(loadPlaylist);
</script>

{#if playlist}
    <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
            <h1 class="text-xl text-(--color-text-primary)">
                {playlist.name}
            </h1>
            <div class="flex gap-2">
                <button
                    onclick={() => (showAddModal = true)}
                    class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-(--color-text-muted) hover:bg-(--color-violet-pale)"
                >
                    {m["add_song"]()}
                </button>
                <button
                    onclick={playAll}
                    class="rounded-lg bg-(--color-accent) px-3 py-2 text-sm text-white hover:bg-(--color-accent-hover)"
                >
                    {m["play_all"]()}
                </button>
            </div>
        </div>

        <div class="flex flex-col gap-0.5">
            <input
                bind:value={localQuery}
                placeholder={m["search_in_this_playlist"]()}
                maxlength={MAX_QUERY_LENGTH}
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-gray-400"
            />
            <span class="self-end text-xs text-(--color-text-muted)">
                {localQuery.length}/{MAX_QUERY_LENGTH}
            </span>
        </div>

        <MusicList
            musics={filteredMusics}
            queueMusics={playlist.musics}
            {playlistId}
            onRemoved={loadPlaylist}
        />
    </div>
{/if}

{#if showAddModal}
    <div class="fixed inset-0 flex items-center justify-center bg-black/20">
        <div
            class="flex h-96 w-96 flex-col gap-3 rounded-lg bg-(--color-surface) p-6"
        >
            <div class="flex items-center justify-between">
                <h2 class="text-lg text-(--color-text-primary)">
                    {m["add_song"]()}
                </h2>
                <button
                    onclick={() => (showAddModal = false)}
                    class="text-(--color-text-muted)">Close</button
                >
            </div>
            <div class="flex flex-col gap-0.5">
                <input
                    bind:value={addQuery}
                    oninput={searchToAdd}
                    placeholder={m["search_songs"]()}
                    maxlength={MAX_QUERY_LENGTH}
                    class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-gray-400"
                />
                <span class="self-end text-xs text-(--color-text-muted)">
                    {addQuery.length}/{MAX_QUERY_LENGTH}
                </span>
            </div>
            <div class="flex flex-1 flex-col gap-1 overflow-y-auto">
                {#each visibleAddResults as music}
                    <button
                        onclick={() => addSong(music.id)}
                        class="flex items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-(--color-violet-pale)"
                    >
                        <img
                            src={music.thumbnailUrl ?? "/placeholder.png"}
                            alt=""
                            class="h-10 w-10 rounded-lg"
                        />
                        <div class="flex flex-col">
                            <span class="text-sm text-(--color-text-primary)"
                                >{music.title}</span
                            >
                            <span class="text-sm text-(--color-text-muted)"
                                >{music.artist.name}</span
                            >
                        </div>
                    </button>
                {/each}
            </div>
        </div>
    </div>
{/if}
