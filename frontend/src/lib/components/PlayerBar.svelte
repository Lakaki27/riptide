<script lang="ts">
import { playerStore } from "$lib/stores/player";

let audioEl: HTMLAudioElement;
let currentTime = $state(0);

$effect(() => {
	if (audioEl && $playerStore.audioUrl) {
		audioEl.src = $playerStore.audioUrl;
		if ($playerStore.isPlaying) audioEl.play();
	}
});

const track = $derived($playerStore.queue[$playerStore.currentIndex]);

function formatTime(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = Math.floor(seconds % 60);
	return `${m}:${s.toString().padStart(2, "0")}`;
}
</script>

<audio
    bind:this={audioEl}
    bind:currentTime
    onended={() => playerStore.next()}
    onplay={() => playerStore.togglePlay()}
></audio>

{#if track}
    <div class="flex items-center gap-4 border-t border-violet-100 bg-white px-6 py-3">
        <img src={track.thumbnailUrl ?? "/placeholder.png"} alt="" class="h-12 w-12 rounded-lg" />
        <div class="flex flex-col">
            <span class="text-sm text-neutral-900">{track.title}</span>
            <span class="text-sm text-neutral-500">{track.artist.name}</span>
        </div>
        <div class="flex flex-1 items-center gap-2">
            <span class="text-sm text-neutral-500">{formatTime(currentTime)}</span>
            <input
                type="range"
                min="0"
                max={track.durationSeconds}
                bind:value={currentTime}
                onchange={() => (audioEl.currentTime = currentTime)}
                class="flex-1 accent-violet-500"
            />
            <span class="text-sm text-neutral-500">{formatTime(track.durationSeconds)}</span>
        </div>
        <button onclick={() => playerStore.previous()} class="text-neutral-500 hover:text-violet-600">prev</button>
        <button
            onclick={() => (audioEl.paused ? audioEl.play() : audioEl.pause())}
            class="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500 text-white hover:bg-violet-600"
        >
            {audioEl?.paused ? "play" : "pause"}
        </button>
        <button onclick={() => playerStore.next()} class="text-neutral-500 hover:text-violet-600">next</button>
    </div>
{/if}
