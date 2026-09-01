<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { apiFetch } from "$lib/api";
    import { playerStore } from "$lib/stores/player";
    import type { Music } from "$lib/types";
    import MusicList from "$lib/components/MusicList.svelte";

    const artistId = page.params.id;

    interface ArtistDetail {
        id: string;
        name: string;
        createdAt: string;
        musics: Music[];
        total: number;
    }

    let artist = $state<ArtistDetail | null>(null);

    async function loadArtist() {
        artist = await apiFetch<ArtistDetail>(`/artists/${artistId}`);
    }

    function playAll() {
        if (artist) playerStore.setQueue(artist.musics, 0);
    }

    onMount(loadArtist);
</script>

{#if artist}
    <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
            <h1 class="text-xl text-neutral-900">{artist.name}</h1>
            <button
                onclick={playAll}
                class="rounded-lg bg-violet-500 px-3 py-2 text-sm text-white hover:bg-violet-600"
            >
                Play all
            </button>
        </div>

        <MusicList musics={artist.musics} />
    </div>
{/if}
