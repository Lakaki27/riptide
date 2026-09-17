<script lang="ts">
    import { onMount } from "svelte";
    import { apiFetch } from "$lib/api";
    import AddSongModal from "$lib/components/AddSongModal.svelte";
    import MusicList from "$lib/components/MusicList.svelte";
    import { m } from "$lib/paraglide/messages";
    import { authStore } from "$lib/stores/auth";
    import { downloadsStore } from "$lib/stores/downloads";
    import type { Music } from "$lib/types";

    const MAX_QUERY_LENGTH = 100;

    let allMusics = $state<Music[]>([]);
    let musics = $state<Music[]>([]);
    let query = $state("");
    let showAddModal = $state(false);

    async function loadMusics() {
        const data = await apiFetch<Music[]>("/musics");
        allMusics = data;
        musics = data;
    }

    async function search() {
        if (!query.trim()) {
            musics = allMusics;
            return;
        }

        const data = await apiFetch<Music[]>(
            `/search?type=music&q=${encodeURIComponent(query)}`,
        );

        musics = data;
    }

    let previousDoneCount = 0;

    $effect(() => {
        const doneCount = $downloadsStore.filter(
            (j) => j.status === "done",
        ).length;

        if (doneCount > previousDoneCount) {
            loadMusics();
        }

        previousDoneCount = doneCount;
    });

    onMount(loadMusics);
</script>

<div class="flex h-full flex-col gap-4">
    <div
        class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
    >
        <h1 class="text-xl text-(--color-text-primary)">{m["nav.home"]()}</h1>

        {#if $authStore.role === "admin"}
            <button
                type="button"
                onclick={() => (showAddModal = true)}
                class="cursor-pointer rounded-xl bg-(--color-accent) px-3 py-2 text-sm text-white shadow-sm outline-none transition-colors hover:bg-(--color-accent-hover) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2 active:scale-95"
            >
                {m["add_music"]()}
            </button>
        {/if}
    </div>

    <label class="sr-only" for="song-search">
        {m["search_songs"]()}
    </label>

    <div class="flex flex-col gap-0.5">
        <input
            id="song-search"
            type="search"
            bind:value={query}
            oninput={search}
            placeholder={m["search_songs"]()}
            maxlength={MAX_QUERY_LENGTH}
            class="w-full cursor-text rounded-xl border border-gray-300 bg-(--color-surface) px-3 py-2.5 text-sm text-(--color-text-primary) shadow-sm outline-none placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2"
        />
        <span class="self-end text-xs text-(--color-text-muted)">
            {query.length}/{MAX_QUERY_LENGTH}
        </span>
    </div>

    <div class="flex-1 overflow-y-auto">
        <MusicList {musics} queueMusics={allMusics} sourceId="home" />
    </div>
</div>

{#if showAddModal}
    <AddSongModal onClose={() => (showAddModal = false)} />
{/if}
