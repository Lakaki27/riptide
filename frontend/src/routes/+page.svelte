<script lang="ts">
    import { onMount } from "svelte";
    import { apiFetch } from "$lib/api";
    import AddSongModal from "$lib/components/AddSongModal.svelte";
    import MusicList from "$lib/components/MusicList.svelte";
    import { m } from "$lib/paraglide/messages";
    import { authStore } from "$lib/stores/auth";
    import { downloadsStore } from "$lib/stores/downloads";
    import type { Music, PaginatedResponse } from "$lib/types";

    let musics = $state<Music[]>([]);
    let query = $state("");
    let page = $state(1);
    let totalPages = $state(1);
    let loading = $state(false);
    let showAddModal = $state(false);

    async function loadPage(reset = false) {
        if (loading) return;
        if (reset) {
            musics = [];
            page = 1;
            totalPages = 1;
        }
        if (page > totalPages) return;

        loading = true;
        const data = await apiFetch<PaginatedResponse<Music>>(
            `/musics?page=${page}&limit=50`,
        );
        musics = [...musics, ...data.results];
        totalPages = data.totalPages;
        page += 1;
        loading = false;
    }

    async function search() {
        if (!query.trim()) {
            await loadPage(true);
            return;
        }
        const data = await apiFetch<PaginatedResponse<Music>>(
            `/search?type=music&q=${encodeURIComponent(query)}`,
        );
        musics = data.results;
        totalPages = 1;
        page = 2;
    }

    function onScroll(e: Event) {
        if (query.trim()) return;
        const el = e.target as HTMLElement;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
            loadPage();
        }
    }

    let previousDoneCount = 0;
    $effect(() => {
        const doneCount = $downloadsStore.filter(
            (j) => j.status === "done",
        ).length;
        if (doneCount > previousDoneCount) {
            loadPage(true);
        }
        previousDoneCount = doneCount;
    });

    onMount(() => loadPage());
</script>

<div class="flex h-full flex-col gap-4">
    <div
        class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
    >
        <h1 class="text-xl text-[var(--color-text-primary)]">Home</h1>

        {#if $authStore.role === "admin"}
            <button
                type="button"
                onclick={() => (showAddModal = true)}
                class="cursor-pointer rounded-xl bg-[var(--color-accent)] px-3 py-2 text-sm text-white shadow-sm outline-none transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 active:scale-95"
            >
                {m["add_music"]()}
            </button>
        {/if}
    </div>

    <label class="sr-only" for="song-search">
        {m["search_songs"]()}
    </label>
    <input
        id="song-search"
        type="search"
        bind:value={query}
        oninput={search}
        placeholder={m["search_songs"]()}
        class="cursor-text rounded-xl border border-gray-300 bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text-primary)] shadow-sm outline-none placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
    />

    <div
        class="flex-1 overflow-y-auto"
        onscroll={onScroll}
        tabindex="0"
        aria-label="Music library"
    >
        <MusicList {musics} />
    </div>
</div>

{#if showAddModal}
    <AddSongModal onClose={() => (showAddModal = false)} />
{/if}
