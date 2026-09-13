<script lang="ts">
    import { onMount } from "svelte";
    import { apiFetch } from "$lib/api";
    import { m } from "$lib/paraglide/messages";
    import type { Artist } from "$lib/types";

    let artists = $state<Artist[]>([]);
    let query = $state("");
    let loading = $state(false);

    async function loadArtists() {
        loading = true;
        artists = await apiFetch<Artist[]>("/artists");
        loading = false;
    }

    async function search() {
        if (!query.trim()) {
            await loadArtists();
            return;
        }
        artists = await apiFetch<Artist[]>(
            `/search?type=artist&q=${encodeURIComponent(query)}`,
        );
    }

    onMount(() => loadArtists());
</script>

<div class="flex h-full flex-col gap-4">
    <h1 class="text-xl text-(--color-text-primary)">{m["nav.artists"]()}</h1>

    <input
        bind:value={query}
        oninput={search}
        placeholder={m["search_artists"]()}
        class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-gray-400"
    />

    <div class="flex-1 overflow-y-auto">
        <div
            class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4"
        >
            {#each artists as artist}
                <a
                    href="/artists/{artist.id}"
                    class="flex flex-col items-center gap-2 rounded-xl bg-(--color-surface) p-3 shadow-sm transition-all hover:bg-(--color-violet-pale) hover:shadow-md active:scale-95 md:p-4"
                >
                    <div
                        class="flex aspect-square w-full items-center justify-center rounded-full bg-(--color-violet-pale) text-2xl text-(--color-accent) md:text-3xl"
                    >
                        {artist.name.slice(0, 1).toUpperCase()}
                    </div>
                    <span
                        class="w-full truncate text-center text-sm text-(--color-text-primary)"
                    >
                        {artist.name}
                    </span>
                </a>
            {/each}
        </div>
    </div>
</div>
