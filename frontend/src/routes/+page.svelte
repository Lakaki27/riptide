<script lang="ts">
    import { onMount } from "svelte";
    import { apiFetch } from "$lib/api";
    import { downloadsStore } from "$lib/stores/downloads";
    import type { Music, PaginatedResponse } from "$lib/types";
    import AddSongModal from "$lib/components/AddSongModal.svelte";
    import MusicList from "$lib/components/MusicList.svelte";

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
    <div class="flex items-center justify-between gap-4">
        <h1 class="text-xl text-neutral-900">All songs</h1>
        <button
            onclick={() => (showAddModal = true)}
            class="rounded-lg bg-violet-500 px-3 py-2 text-sm text-white hover:bg-violet-600"
        >
            Add from URL
        </button>
    </div>

    <input
        bind:value={query}
        oninput={search}
        placeholder="Search songs..."
        class="rounded-lg border border-violet-100 px-3 py-2 text-sm"
    />

    <div class="flex-1 overflow-y-auto" onscroll={onScroll}>
        <MusicList {musics} />
    </div>
</div>

{#if showAddModal}
    <AddSongModal onClose={() => (showAddModal = false)} />
{/if}
