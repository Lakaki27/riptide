<script lang="ts">
import { onMount } from "svelte";
import { apiFetch } from "$lib/api";
import { playerStore } from "$lib/stores/player";
import type { Music, PaginatedResponse } from "$lib/types";

let musics = $state<Music[]>([]);
let page = $state(1);
let totalPages = $state(1);
let loading = $state(false);

async function loadPage() {
	if (loading || page > totalPages) return;
	loading = true;
	const data = await apiFetch<PaginatedResponse<Music>>(
		`/musics?page=${page}&limit=50`,
	);
	musics = [...musics, ...data.results];
	totalPages = data.totalPages;
	page += 1;
	loading = false;
}

function onScroll(e: Event) {
	const el = e.target as HTMLElement;
	if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
		loadPage();
	}
}

onMount(loadPage);
</script>

<div class="h-full overflow-y-auto" onscroll={onScroll}>
    <h1 class="mb-4 text-xl text-neutral-900">All songs</h1>
    <div class="flex flex-col gap-1">
        {#each musics as music, i}
            <button
                onclick={() => playerStore.setQueue(musics, i)}
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
