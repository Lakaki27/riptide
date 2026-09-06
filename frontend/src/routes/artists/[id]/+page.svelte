<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { apiFetch } from "$lib/api";
    import { playerStore } from "$lib/stores/player";
    import type { Music } from "$lib/types";
    import MusicList from "$lib/components/MusicList.svelte";
    import { m } from "$lib/paraglide/messages";

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

    function goBack() {
        if (window.history.length > 1) {
            history.back();
        } else {
            goto("/");
        }
    }

    onMount(loadArtist);
</script>

{#if artist}
    <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <button
                    onclick={goBack}
                    class="flex h-9 w-9 items-center justify-center rounded-full text-xl text-neutral-500 transition-colors hover:bg-violet-100 hover:text-violet-600 active:scale-90"
                >
                    <i class="bx bx-arrow-back"></i>
                </button>
                <h1 class="text-xl text-neutral-900">{artist.name}</h1>
            </div>
            <button
                onclick={playAll}
                class="rounded-xl bg-violet-500 px-3 py-2 text-sm text-white shadow-sm transition-colors hover:bg-violet-600 active:scale-95"
            >
                {m["play_all"]()}
            </button>
        </div>

        <MusicList musics={artist.musics} />
    </div>
{/if}
