<script lang="ts">
import MusicRow from "$lib/components/MusicRow.svelte";
import { m } from "$lib/paraglide/messages";
import { playerStore } from "$lib/stores/player";
import type { Music } from "$lib/types";

interface Props {
    musics: Music[];
    queueMusics?: Music[];
    playlistId?: string;
    onRemoved?: () => void;
    activeIndex?: number;
    compact?: boolean;
    showMenu?: boolean;
    showFilters?: boolean;
    onPlay?: (index: number) => void;
    onTitleNavigate?: (music: Music) => void;
    sourceId?: string;
}

type SortField = "createdAt" | "name" | "artist" | "duration";
type SortDirection = "asc" | "desc";

let {
    musics,
    queueMusics = musics,
    playlistId,
    onRemoved,
    activeIndex = -1,
    compact = false,
    showMenu = true,
    showFilters = true,
    onPlay,
    onTitleNavigate,
    sourceId = "default",
}: Props = $props();

let sortField = $state<SortField>("createdAt");
let sortDirection = $state<SortDirection>("desc");

const sortedMusics = $derived(
    [...musics].sort((a, b) => {
        let result = 0;

        switch (sortField) {
            case "createdAt":
                result = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                break;

            case "name":
                result = a.title.localeCompare(b.title, undefined, {
                    sensitivity: "base",
                });
                break;

            case "artist":
                result = a.artist.name.localeCompare(b.artist.name, undefined, {
                    sensitivity: "base",
                });
                break;

            case "duration":
                result = a.durationSeconds - b.durationSeconds;
                break;
        }

        return sortDirection === "asc" ? result : -result;
    }),
);

function applySort() {
    playerStore.sortQueue(sortedMusics);
}

function toggleSortDirection() {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";

    applySort();
}

function handleSortFieldChange() {
    applySort();
}

function handlePlay(music: Music) {
    if (onPlay) {
        const index = musics.findIndex((item) => item.id === music.id);

        if (index >= 0) {
            onPlay(index);
        }

        return;
    }

    playerStore.playFromList(queueMusics, music, sourceId);
}
</script>

{#if showFilters}
    <div class="mb-2 flex items-center gap-2">
        <select
            bind:value={sortField}
            onchange={handleSortFieldChange}
            class="rounded-lg border border-(--color-border) bg-(--color-bg) px-3 py-2 text-sm text-(--color-text-primary)"
            aria-label="Sort by"
        >
            <option value="createdAt"
                >{m["music_list_filters.created_at"]()}</option
            >
            <option value="name">{m["music_list_filters.name"]()}</option>
            <option value="artist">{m["music_list_filters.artist"]()}</option>
            <option value="duration"
                >{m["music_list_filters.duration"]()}</option
            >
        </select>

        <button
            type="button"
            onclick={toggleSortDirection}
            class="flex h-9 w-9 items-center justify-center rounded-lg text-(--color-text-muted) hover:bg-(--color-violet-pale) hover:text-(--color-accent)"
            aria-label={sortDirection === "asc" ? "Ascending" : "Descending"}
        >
            <i
                class={[
                    "bx text-lg",
                    sortDirection === "asc"
                        ? "bx-up-arrow-alt"
                        : "bx-down-arrow-alt",
                ]}
            ></i>
        </button>
    </div>
{/if}

<div class="flex flex-col gap-1">
    {#each sortedMusics as music}
        <MusicRow
            {music}
            onPlay={() => handlePlay(music)}
            {playlistId}
            {onRemoved}
            active={music.id === queueMusics[activeIndex]?.id}
            {compact}
            {showMenu}
            {onTitleNavigate}
        />
    {/each}
</div>
