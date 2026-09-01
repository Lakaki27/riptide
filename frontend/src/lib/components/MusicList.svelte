<script lang="ts">
    import MusicRow from "$lib/components/MusicRow.svelte";
    import { playerStore } from "$lib/stores/player";
    import type { Music } from "$lib/types";

    interface Props {
        musics: Music[];
        playlistId?: string;
        onRemoved?: () => void;
        activeIndex?: number;
        compact?: boolean;
        showMenu?: boolean;
        onPlay?: (index: number) => void;
    }

    let {
        musics,
        playlistId,
        onRemoved,
        activeIndex = -1,
        compact = false,
        showMenu = true,
        onPlay,
    }: Props = $props();

    function handlePlay(index: number) {
        if (onPlay) {
            onPlay(index);
        } else {
            playerStore.setQueue(musics, index);
        }
    }
</script>

<div class="flex flex-col gap-1">
    {#each musics as music, i}
        <MusicRow
            {music}
            onPlay={() => handlePlay(i)}
            {playlistId}
            {onRemoved}
            active={i === activeIndex}
            {compact}
            {showMenu}
        />
    {/each}
</div>
