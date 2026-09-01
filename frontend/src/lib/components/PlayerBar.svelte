<script lang="ts">
    import { playerStore } from "$lib/stores/player";

    let audioEl: HTMLAudioElement;
    let currentTime = $state(0);
    let loadedUrl = $state<string | null>(null);
    let isPlaying = $state(false);
    let titleEl: HTMLElement;
    let titleContainerEl: HTMLElement;
    let titleOverflows = $state(false);
    let volume = $state(1);
    let showVolumeSlider = $state(false);

    $effect(() => {
        if (
            audioEl &&
            $playerStore.audioUrl &&
            $playerStore.audioUrl !== loadedUrl
        ) {
            loadedUrl = $playerStore.audioUrl;
            audioEl.src = $playerStore.audioUrl;
            if ($playerStore.isPlaying) {
                audioEl.play();
            }
        }
    });

    const track = $derived($playerStore.queue[$playerStore.currentIndex]);

    $effect(() => {
        document.title = track ? `${track.title} — riptide` : "riptide";
    });

    $effect(() => {
        track;
        titleOverflows = false;
        queueMicrotask(() => {
            if (titleEl && titleContainerEl) {
                titleOverflows =
                    titleEl.scrollWidth > titleContainerEl.clientWidth;
            }
        });
    });

    $effect(() => {
        const stored = localStorage.getItem("riptide-volume");
        if (stored !== null) {
            volume = Number(stored);
        }
    });

    $effect(() => {
        if (audioEl) {
            audioEl.volume = volume;
        }
        localStorage.setItem("riptide-volume", String(volume));
    });

    function formatTime(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    }

    function togglePlayback() {
        if (audioEl.paused) {
            audioEl.play();
        } else {
            audioEl.pause();
        }
    }

    function volumeIcon(): string {
        if (volume === 0) return "bx-volume-mute";
        if (volume < 0.5) return "bx-volume-low";
        return "bx-volume-full";
    }

    const modeOrder = [
        "normal",
        "loop-song",
        "loop-playlist",
        "randomize",
    ] as const;

    const modeIcon: Record<(typeof modeOrder)[number], string> = {
        normal: "bx-music",
        "loop-song": "bx-rotate-right",
        "loop-playlist": "bx-repeat",
        randomize: "bx-shuffle",
    };

    const modeLabel: Record<(typeof modeOrder)[number], string> = {
        normal: "Play through",
        "loop-song": "Loop this song",
        "loop-playlist": "Loop playlist",
        randomize: "Shuffle",
    };

    function cycleMode() {
        const currentIndex = modeOrder.indexOf($playerStore.mode);
        const nextIndex = (currentIndex + 1) % modeOrder.length;
        playerStore.setMode(modeOrder[nextIndex]);
    }
</script>

<audio
    bind:this={audioEl}
    bind:currentTime
    onended={() => playerStore.next()}
    onplay={() => (isPlaying = true)}
    onpause={() => (isPlaying = false)}
></audio>

{#if track}
    <div
        class="flex items-center gap-6 border-t border-violet-100 bg-white px-6 py-3"
    >
        <img
            src={track.thumbnailUrl ?? "/placeholder.png"}
            alt=""
            class="h-12 w-12 shrink-0 rounded-lg"
        />

        <div
            bind:this={titleContainerEl}
            class="flex w-72 shrink-0 flex-col overflow-hidden"
        >
            <div class="overflow-hidden whitespace-nowrap">
                <span
                    bind:this={titleEl}
                    class="inline-block text-sm text-neutral-900 {titleOverflows
                        ? 'marquee'
                        : ''}"
                >
                    {track.title}
                </span>
            </div>
            <a
                href="/artists/{track.artist.id}"
                class="w-fit truncate text-sm text-neutral-500 hover:text-violet-600 hover:underline"
            >
                {track.artist.name}
            </a>
        </div>

        <div class="flex flex-1 items-center gap-2">
            <span class="text-sm text-neutral-500"
                >{formatTime(currentTime)}</span
            >
            <input
                type="range"
                min="0"
                max={track.durationSeconds}
                bind:value={currentTime}
                onchange={() => (audioEl.currentTime = currentTime)}
                class="flex-1 accent-violet-500"
            />
            <span class="text-sm text-neutral-500"
                >{formatTime(track.durationSeconds)}</span
            >
        </div>

        <div class="flex shrink-0 items-center gap-8 pl-4">
            <div
                class="relative flex items-center"
                onmouseenter={() => (showVolumeSlider = true)}
                onmouseleave={() => (showVolumeSlider = false)}
            >
                <button class="text-xl text-neutral-500 hover:text-violet-600">
                    <i class="bx {volumeIcon()}"></i>
                </button>

                {#if showVolumeSlider}
                    <div
                        class="absolute bottom-full left-1/2 -translate-x-1/2 pb-2"
                    >
                        <div
                            class="rounded-lg border border-violet-100 bg-white p-3 shadow-md"
                        >
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                bind:value={volume}
                                class="h-24 w-2 accent-violet-500"
                                style="writing-mode: vertical-lr; direction: rtl;"
                            />
                        </div>
                    </div>
                {/if}
            </div>

            <button
                onclick={cycleMode}
                class="text-xl {$playerStore.mode === 'normal'
                    ? 'text-neutral-400 hover:text-neutral-600'
                    : 'text-violet-600'}"
                title={modeLabel[$playerStore.mode]}
            >
                <i class="bx {modeIcon[$playerStore.mode]}"></i>
            </button>

            <button
                onclick={() => playerStore.previous()}
                class="text-2xl text-neutral-500 hover:text-violet-600"
            >
                <i class="bx bx-skip-previous"></i>
            </button>

            <button
                onclick={togglePlayback}
                class="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500 text-2xl text-white hover:bg-violet-600"
            >
                <i class="bx {isPlaying ? 'bx-pause' : 'bx-play'}"></i>
            </button>

            <button
                onclick={() => playerStore.skipNext()}
                class="text-2xl text-neutral-500 hover:text-violet-600"
            >
                <i class="bx bx-skip-next"></i>
            </button>
        </div>
    </div>
{/if}

<style>
    .marquee {
        padding-right: 3rem;
        animation: marquee 12s linear infinite;
    }

    @keyframes marquee {
        0%,
        20% {
            transform: translateX(0);
        }
        100% {
            transform: translateX(-100%);
        }
    }
</style>
