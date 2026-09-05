<script lang="ts">
    import SongMenu from "$lib/components/SongMenu.svelte";
    import type { Music } from "$lib/types";
    import { goto } from "$app/navigation";

    interface Props {
        music: Music;
        onPlay: () => void;
        playlistId?: string;
        onRemoved?: () => void;
        active?: boolean;
        compact?: boolean;
        showMenu?: boolean;
        onTitleNavigate?: (music: Music) => void;
    }

    let {
        music,
        onPlay,
        playlistId,
        onRemoved,
        active = false,
        compact = false,
        showMenu = true,
        onTitleNavigate,
    }: Props = $props();

    function stop(e: Event) {
        e.stopPropagation();
    }

    function handleTitleClick(e: Event) {
        if (onTitleNavigate) {
            stop(e);
            onTitleNavigate(music);
        }
    }
</script>

<div
    onclick={onPlay}
    onkeydown={(e) => e.key === "Enter" && onPlay()}
    role="button"
    tabindex="0"
    class="flex items-center gap-3 rounded-lg px-2 py-2 {active
        ? 'bg-violet-100'
        : 'hover:bg-violet-100'}"
>
    <img
        src={music.thumbnailUrl ?? "/placeholder.png"}
        alt=""
        class="{compact ? 'h-8 w-8' : 'h-10 w-10'} shrink-0 rounded-lg"
    />

    <div class="flex min-w-0 flex-1 flex-col">
        {#if onTitleNavigate}
            <button
                onclick={handleTitleClick}
                class="max-w-full self-start truncate text-left text-sm text-neutral-900 hover:underline"
            >
                {music.title}
            </button>
        {:else}
            <span class="block w-full truncate text-sm text-neutral-900"
                >{music.title}</span
            >
        {/if}

        <button
            onclick={(e) => {
                stop(e);
                goto(`/artists/${music.artist.id}`);
            }}
            class="hidden max-w-full self-start truncate text-left text-sm text-neutral-500 hover:text-violet-600 hover:underline md:inline-block"
        >
            {music.artist.name}
        </button>
        <span class="block w-full truncate text-sm text-neutral-500 md:hidden"
            >{music.artist.name}</span
        >
    </div>

    {#if showMenu}
        <div onclick={stop} onkeydown={stop} role="presentation">
            <SongMenu {music} {playlistId} {onRemoved} />
        </div>
    {/if}
</div>
