<script lang="ts">
    import { goto } from "$app/navigation";
    import { apiFetch } from "$lib/api";
    import { m } from "$lib/paraglide/messages";
    import { playerStore } from "$lib/stores/player";
    import type { Artist, Music, PaginatedResponse } from "$lib/types";

    let query = $state("");
    let searchType = $state<"music" | "artist">("music");
    let musicResults = $state<Music[]>([]);
    let artistResults = $state<Artist[]>([]);
    let open = $state(false);

    async function runSearch() {
        if (!query.trim()) {
            musicResults = [];
            artistResults = [];
            open = false;
            return;
        }

        if (searchType === "music") {
            const data = await apiFetch<PaginatedResponse<Music>>(
                `/search?type=music&q=${encodeURIComponent(query)}`,
            );
            musicResults = data.results;
        } else {
            const data = await apiFetch<PaginatedResponse<Artist>>(
                `/search?type=artist&q=${encodeURIComponent(query)}`,
            );
            artistResults = data.results;
        }
        open = true;
    }

    function playMusic(music: Music, results: Music[], index: number) {
        playerStore.setQueue(results, index);
        open = false;
        query = "";
    }

    function goToArtist(artist: Artist) {
        goto(`/artists/${artist.id}`);
        open = false;
        query = "";
    }
</script>

<div class="relative">
    <div class="flex items-center gap-2">
        <div
            class="flex rounded-lg border border-violet-100 bg-white p-0.5 text-sm"
        >
            <button
                onclick={() => {
                    searchType = "music";
                    runSearch();
                }}
                class="rounded px-2 py-1 {searchType === 'music'
                    ? 'bg-violet-500 text-white'
                    : 'text-neutral-500'}"
            >
                Songs
            </button>
            <button
                onclick={() => {
                    searchType = "artist";
                    runSearch();
                }}
                class="rounded px-2 py-1 {searchType === 'artist'
                    ? 'bg-violet-500 text-white'
                    : 'text-neutral-500'}"
            >
                Artists
            </button>
        </div>

        <input
            bind:value={query}
            oninput={runSearch}
            placeholder={searchType === "music"
                ? m["search_songs"]()
                : m["search_artists"]()}
            class="flex-1 rounded-lg border border-violet-100 px-3 py-2 text-sm"
        />
    </div>

    {#if open && (musicResults.length > 0 || artistResults.length > 0)}
        <div
            class="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-lg border border-violet-100 bg-white p-2 shadow-md"
        >
            {#if searchType === "music"}
                {#each musicResults as music, i}
                    <button
                        onclick={() => playMusic(music, musicResults, i)}
                        class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-violet-100"
                    >
                        <img
                            src={music.thumbnailUrl ?? "/placeholder.png"}
                            alt=""
                            class="h-8 w-8 rounded"
                        />
                        <div class="flex flex-col">
                            <span class="text-sm text-neutral-900"
                                >{music.title}</span
                            >
                            <span class="text-sm text-neutral-500"
                                >{music.artist.name}</span
                            >
                        </div>
                    </button>
                {/each}
            {:else}
                {#each artistResults as artist}
                    <button
                        onclick={() => goToArtist(artist)}
                        class="flex w-full items-center rounded-lg px-2 py-2 text-left hover:bg-violet-100"
                    >
                        <span class="text-sm text-neutral-900"
                            >{artist.name}</span
                        >
                    </button>
                {/each}
            {/if}
        </div>
    {/if}
</div>
