<script lang="ts">
    import { playerStore } from "$lib/stores/player";
    import type { Music } from "$lib/types";

    interface Props {
        track: Music;
        currentTime: number;
        isPlaying: boolean;
        expanded: boolean;
        audioEl: HTMLAudioElement;
        togglePlayback: () => void;
        setExpanded: (value: boolean) => void;
    }

    let {
        track,
        currentTime,
        isPlaying,
        expanded,
        audioEl,
        togglePlayback,
        setExpanded,
    }: Props = $props();

    let titleEl: HTMLElement;
    let titleContainerEl: HTMLElement;
    let titleOverflows = $state(false);
    let volume = $state(1);
    let showVolumeSlider = $state(false);
    let dragStartY = $state<number | null>(null);
    let dragOffsetY = $state(0);
    let dragging = $state(false);

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
        if (stored !== null) volume = Number(stored);
    });

    $effect(() => {
        if (audioEl) audioEl.volume = volume;
        localStorage.setItem("riptide-volume", String(volume));
    });

    function formatTime(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
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
        playerStore.setMode(modeOrder[(currentIndex + 1) % modeOrder.length]);
    }

    function stop(e: Event) {
        e.stopPropagation();
    }

    function onTouchStart(e: TouchEvent) {
        dragStartY = e.touches[0].clientY;
        dragging = true;
    }

    function onTouchMove(e: TouchEvent) {
        if (dragStartY === null) return;
        const delta = e.touches[0].clientY - dragStartY;
        if (delta < 0) dragOffsetY = delta;
    }

    function onTouchEnd() {
        dragging = false;
        if (dragOffsetY < -50) setExpanded(true);
        dragOffsetY = 0;
        dragStartY = null;
    }
</script>

<div
    onclick={() => setExpanded(true)}
    onkeydown={(e) => e.key === "Enter" && setExpanded(true)}
    ontouchstart={onTouchStart}
    ontouchmove={onTouchMove}
    ontouchend={onTouchEnd}
    role="button"
    tabindex="0"
    style="transform: translateY({Math.max(
        dragOffsetY,
        -30,
    )}px); transition: {dragging ? 'none' : 'var(--transition-base)'};"
    class="flex w-full items-center gap-3 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-left md:gap-6 md:px-6 md:py-3"
>
    <img
        src={track.thumbnailUrl ?? "/placeholder.png"}
        alt=""
        style={expanded ? "" : "view-transition-name: album-art;"}
        class="h-12 w-12 shrink-0 rounded-lg object-cover {expanded
            ? 'hidden md:block'
            : ''}"
    />

    <div
        bind:this={titleContainerEl}
        class="flex min-w-0 flex-1 flex-col overflow-hidden md:w-72 md:flex-none"
    >
        <div class="overflow-hidden whitespace-nowrap">
            {#if titleOverflows}
                <div class="marquee inline-flex">
                    <span
                        bind:this={titleEl}
                        class="inline-block pr-20 text-base text-[var(--color-text-primary)] md:text-sm"
                    >
                        {track.title}
                    </span>
                    <span
                        class="inline-block pr-20 text-base text-[var(--color-text-primary)] md:text-sm"
                        aria-hidden="true"
                    >
                        {track.title}
                    </span>
                </div>
            {:else}
                <span
                    bind:this={titleEl}
                    class="inline-block text-base text-[var(--color-text-primary)] md:text-sm"
                >
                    {track.title}
                </span>
            {/if}
        </div>
        <span class="truncate text-sm text-[var(--color-text-muted)]"
            >{track.artist.name}</span
        >
    </div>

    <div class="hidden flex-1 items-center gap-2 md:flex">
        <span class="text-sm text-[var(--color-text-muted)]"
            >{formatTime(currentTime)}</span
        >
        <input
            type="range"
            min="0"
            max={track.durationSeconds}
            value={currentTime}
            onchange={(e) =>
                (audioEl.currentTime = Number(e.currentTarget.value))}
            onclick={stop}
            class="flex-1 accent-[var(--color-accent)]"
        />
        <span class="text-sm text-[var(--color-text-muted)]"
            >{formatTime(track.durationSeconds)}</span
        >
    </div>

    <div class="flex shrink-0 items-center gap-4 md:gap-8 md:pl-4">
        <div
            class="relative hidden items-center md:flex"
            onmouseenter={() => (showVolumeSlider = true)}
            onmouseleave={() => (showVolumeSlider = false)}
        >
            <button
                onclick={stop}
                class="text-xl text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            >
                <i class="bx {volumeIcon()}"></i>
            </button>

            {#if showVolumeSlider}
                <div
                    class="absolute bottom-full left-1/2 -translate-x-1/2 pb-2"
                    onclick={stop}
                >
                    <div
                        class="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-md"
                    >
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            bind:value={volume}
                            class="h-24 w-2 accent-[var(--color-accent)]"
                            style="writing-mode: vertical-lr; direction: rtl;"
                        />
                    </div>
                </div>
            {/if}
        </div>

        <button
            onclick={(e) => {
                stop(e);
                cycleMode();
            }}
            class="hidden text-lg md:block {$playerStore.mode === 'normal'
                ? 'text-[var(--color-text-muted)] hover:text-neutral-600'
                : 'text-[var(--color-accent)]'}"
            title={modeLabel[$playerStore.mode]}
        >
            <i class="bx {modeIcon[$playerStore.mode]}"></i>
        </button>

        <button
            onclick={(e) => {
                stop(e);
                playerStore.previous();
            }}
            class="text-3xl hidden md:block text-[var(--color-text-muted)] hover:text-[var(--color-accent)] active:scale-90"
        >
            <i class="bx bx-skip-previous"></i>
        </button>

        <button
            onclick={(e) => {
                stop(e);
                togglePlayback();
            }}
            class="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)] text-3xl text-white hover:bg-[var(--color-accent-hover)] active:scale-90"
        >
            <i class="bx {isPlaying ? 'bx-pause' : 'bx-play'}"></i>
        </button>

        <button
            onclick={(e) => {
                stop(e);
                playerStore.skipNext();
            }}
            class="text-3xl hidden md:block text-[var(--color-text-muted)] hover:text-[var(--color-accent)] active:scale-90"
        >
            <i class="bx bx-skip-next"></i>
        </button>
    </div>
</div>

<style>
    .marquee {
        animation: marquee 20s linear infinite;
    }

    @keyframes marquee {
        0%,
        18% {
            transform: translateX(0);
        }
        100% {
            transform: translateX(-50%);
        }
    }
</style>
