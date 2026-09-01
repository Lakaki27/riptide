<script lang="ts">
    import SongMenu from "$lib/components/SongMenu.svelte";
    import type { Music } from "$lib/types";

    interface Props {
        music: Music;
        onPlay: () => void;
        playlistId?: string;
        onRemoved?: () => void;
        active?: boolean;
        compact?: boolean;
        showMenu?: boolean;
    }

    let {
        music,
        onPlay,
        playlistId,
        onRemoved,
        active = false,
        compact = false,
        showMenu = true,
    }: Props = $props();
</script>

<div
    class="relative flex items-center gap-3 rounded-lg px-2 py-2 {active
        ? 'bg-violet-100'
        : 'hover:bg-violet-100'}"
>
    <!-- Clickable area -->
    <button
        type="button"
        onclick={onPlay}
        aria-label={`Play ${music.title}`}
        class="absolute inset-0 h-full w-full rounded-lg"
    ></button>

    <!-- Visual content -->
    <img
        src={music.thumbnailUrl ?? "/placeholder.png"}
        alt=""
        class="{compact
            ? 'h-8 w-8'
            : 'h-10 w-10'} pointer-events-none relative rounded-lg"
    />

    <div class="relative flex min-w-0 flex-1 flex-col">
        <span class="w-fit truncate text-left text-sm text-neutral-900">
            {music.title}
        </span>

        <a
            href="/artists/{music.artist.id}"
            class="relative z-10 w-fit truncate text-sm text-neutral-500 hover:text-violet-600 hover:underline"
        >
            {music.artist.name}
        </a>
    </div>

    {#if showMenu}
        <div class="relative z-10">
            <SongMenu {music} {playlistId} {onRemoved} />
        </div>
    {/if}
</div>
