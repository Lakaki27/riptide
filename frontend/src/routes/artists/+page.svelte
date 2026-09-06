<script lang="ts">
    import { onMount } from "svelte";
    import { apiFetch } from "$lib/api";
    import type { Artist, PaginatedResponse } from "$lib/types";
    import { m } from "$lib/paraglide/messages";

    let artists = $state<Artist[]>([]);
    let query = $state("");
    let page = $state(1);
    let totalPages = $state(1);
    let loading = $state(false);

    async function loadPage(reset = false) {
        if (loading) return;
        if (reset) {
            artists = [];
            page = 1;
            totalPages = 1;
        }
        if (page > totalPages) return;

        loading = true;
        const data = await apiFetch<PaginatedResponse<Artist>>(
            `/artists?page=${page}&limit=50`,
        );
        artists = [...artists, ...data.results];
        totalPages = data.totalPages;
        page += 1;
        loading = false;
    }

    async function search() {
        if (!query.trim()) {
            await loadPage(true);
            return;
        }
        const data = await apiFetch<PaginatedResponse<Artist>>(
            `/search?type=artist&q=${encodeURIComponent(query)}`,
        );
        artists = data.results;
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

    onMount(() => loadPage());
</script>

<div class="flex h-full flex-col gap-4">
    <h1 class="text-xl text-neutral-900">Artists</h1>

    <input
        bind:value={query}
        oninput={search}
        placeholder={m["search_artists"]()}
        class="rounded-lg border border-violet-100 px-3 py-2 text-sm"
    />

    <div class="flex-1 overflow-y-auto" onscroll={onScroll}>
        <div
            class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4"
        >
            {#each artists as artist}
                <a
                    href="/artists/{artist.id}"
                    class="flex flex-col items-center gap-2 rounded-xl bg-white p-3 shadow-sm transition-all hover:bg-violet-100 hover:shadow-md active:scale-95 md:p-4"
                >
                    <div
                        class="flex aspect-square w-full items-center justify-center rounded-full bg-violet-100 text-2xl text-violet-500 md:text-3xl"
                    >
                        {artist.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span
                        class="w-full truncate text-center text-sm text-neutral-900"
                        >{artist.name}</span
                    >
                </a>
            {/each}
        </div>
    </div>
</div>
