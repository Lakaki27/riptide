<script lang="ts">
    import { goto } from "$app/navigation";
    import { playerStore } from "$lib/stores/player";
    import { getDominantColor } from "$lib/utils/dominantColor";

    import type { Music } from "$lib/types";
    import { m } from "$lib/paraglide/messages";

    interface Props {
        track: Music;
        currentTime: number;
        isPlaying: boolean;
        audioEl: HTMLAudioElement;
        togglePlayback: () => void;
        setExpanded: (value: boolean) => void;
        openQueueFromOverlay: () => void;
    }

    let {
        track,
        currentTime,
        isPlaying,
        audioEl,
        togglePlayback,
        setExpanded,
        openQueueFromOverlay,
    }: Props = $props();

    let dragStartY = $state<number | null>(null);
    let dragStartX = $state<number | null>(null);
    let dragOffsetY = $state(0);
    let imgOffsetX = $state(0);
    let dragging = $state(false);
    let axisLocked = $state<"none" | "vertical" | "horizontal">("none");
    let ambientColor = $state<string | null>(null);

    let titleEl: HTMLElement;
    let titleContainerEl: HTMLElement;
    let titleOverflows = $state(false);
    let artistEl: HTMLElement;
    let artistContainerEl: HTMLElement;
    let artistOverflows = $state(false);

    $effect(() => {
        track;
        titleOverflows = false;
        artistOverflows = false;
        queueMicrotask(() => {
            if (titleEl && titleContainerEl) {
                titleOverflows =
                    titleEl.scrollWidth > titleContainerEl.clientWidth;
            }
            if (artistEl && artistContainerEl) {
                artistOverflows =
                    artistEl.scrollWidth > artistContainerEl.clientWidth;
            }
        });
    });

    $effect(() => {
        if (!track?.thumbnailUrl) {
            ambientColor = null;
            return;
        }
        getDominantColor(track.thumbnailUrl).then((color) => {
            ambientColor = color;
        });
    });

    function formatTime(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
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

    function goToArtist() {
        setExpanded(false);
        goto(`/artists/${track.artist.id}`);
    }

    function onTouchStart(e: TouchEvent) {
        dragStartY = e.touches[0].clientY;
        dragStartX = e.touches[0].clientX;
        dragging = true;
        axisLocked = "none";
    }

    function onTouchMove(e: TouchEvent) {
        if (dragStartY === null || dragStartX === null) return;
        const deltaY = e.touches[0].clientY - dragStartY;
        const deltaX = e.touches[0].clientX - dragStartX;

        if (
            axisLocked === "none" &&
            (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)
        ) {
            axisLocked =
                Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
        }

        if (axisLocked === "horizontal") {
            imgOffsetX = deltaX;
        } else if (axisLocked === "vertical" && deltaY > 0) {
            dragOffsetY = deltaY;
        }
    }

    function onTouchEnd() {
        dragging = false;

        if (axisLocked === "vertical" && dragOffsetY > 120) {
            setExpanded(false);
            dragOffsetY = 0;
        } else if (axisLocked === "horizontal" && Math.abs(imgOffsetX) > 80) {
            const goingNext = imgOffsetX < 0;
            imgOffsetX = goingNext ? -320 : 320;
            setTimeout(() => {
                if (goingNext) {
                    playerStore.skipNext();
                } else {
                    playerStore.previous();
                }
                imgOffsetX = 0;
            }, 180);
        } else {
            dragOffsetY = 0;
            imgOffsetX = 0;
        }

        dragStartY = null;
        dragStartX = null;
        axisLocked = "none";
    }

    function formatAudioInfo(): string | null {
        const parts: string[] = [];
        if (track.codec) parts.push(track.codec);
        if (track.bitrateKbps) parts.push(`${track.bitrateKbps}kb/s`);
        if (track.sampleRateHz)
            parts.push(`${(track.sampleRateHz / 1000).toFixed(1)}kHz`);
        return parts.length > 0 ? parts.join(" · ") : null;
    }
</script>

<div
    class="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[var(--color-bg)] md:hidden"
    style="transform: translateY({dragOffsetY}px); transition: {dragging
        ? 'none'
        : 'var(--transition-base)'};"
    ontouchstart={onTouchStart}
    ontouchmove={onTouchMove}
    ontouchend={onTouchEnd}
>
    <div class="relative z-10 flex items-center justify-between p-4">
        <button
            onclick={() => setExpanded(false)}
            class="text-3xl text-[var(--color-text-muted)] active:scale-90"
        >
            <i class="bx bx-chevron-down"></i>
        </button>
        <span class="text-sm font-medium">{m["now_playing"]()}</span>
        <div class="w-8"></div>
    </div>

    <div
        class="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-8"
    >
        <img
            src={track.thumbnailUrl ?? "/placeholder.png"}
            alt=""
            style="view-transition-name: album-art; transform: translateX({imgOffsetX}px); transition: {dragging
                ? 'none'
                : 'transform 0.18s ease'}; {ambientColor
                ? `box-shadow: 0 0 60px 5px ${ambientColor};`
                : ''}"
            class="aspect-square w-full max-w-xs rounded-2xl object-cover"
        />

        <div class="flex w-full flex-col items-center gap-1 text-center">
            <div
                bind:this={titleContainerEl}
                class="w-full overflow-hidden whitespace-nowrap"
            >
                {#if titleOverflows}
                    <div class="marquee inline-flex">
                        <span
                            bind:this={titleEl}
                            class="inline-block pr-20 text-2xl font-bold tracking-tight text-[var(--color-text-primary)]"
                        >
                            {track.title}
                        </span>
                        <span
                            class="inline-block pr-20 text-2xl font-bold tracking-tight text-[var(--color-text-primary)]"
                            aria-hidden="true"
                        >
                            {track.title}
                        </span>
                    </div>
                {:else}
                    <span
                        bind:this={titleEl}
                        class="inline-block text-2xl font-bold tracking-tight text-[var(--color-text-primary)]"
                    >
                        {track.title}
                    </span>
                {/if}
            </div>

            <button
                onclick={goToArtist}
                bind:this={artistContainerEl}
                class="w-full overflow-hidden whitespace-nowrap text-base text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            >
                {#if artistOverflows}
                    <div class="marquee inline-flex">
                        <span bind:this={artistEl} class="inline-block pr-20"
                            >{track.artist.name}</span
                        >
                        <span class="inline-block pr-20" aria-hidden="true"
                            >{track.artist.name}</span
                        >
                    </div>
                {:else}
                    <span bind:this={artistEl} class="inline-block"
                        >{track.artist.name}</span
                    >
                {/if}
            </button>
        </div>

        <div class="flex w-full flex-col gap-2">
            <input
                type="range"
                min="0"
                max={track.durationSeconds}
                value={currentTime}
                onchange={(e) =>
                    (audioEl.currentTime = Number(e.currentTarget.value))}
                class="w-full accent-[var(--color-accent)]"
            />
            <div
                class="flex justify-between text-sm text-[var(--color-text-muted)]"
            >
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(track.durationSeconds)}</span>
            </div>
            {#if formatAudioInfo()}
                <div
                    class="text-center text-xs text-[var(--color-text-muted)] opacity-70"
                >
                    {formatAudioInfo()}
                </div>
            {/if}
        </div>

        <div class="flex w-full items-center justify-between gap-2 px-2">
            <button
                onclick={cycleMode}
                class="flex h-12 w-12 items-center justify-center text-2xl active:scale-90 {$playerStore.mode ===
                'normal'
                    ? 'text-[var(--color-text-muted)]'
                    : 'text-[var(--color-accent)]'}"
                title={modeLabel[$playerStore.mode]}
            >
                <i class="bx {modeIcon[$playerStore.mode]}"></i>
            </button>

            <button
                onclick={() => playerStore.previous()}
                class="flex h-12 w-12 items-center justify-center text-3xl text-neutral-700 active:scale-90"
            >
                <i class="bx bx-skip-previous"></i>
            </button>

            <button
                onclick={togglePlayback}
                class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-3xl text-white active:scale-90"
            >
                <i class="bx {isPlaying ? 'bx-pause' : 'bx-play'}"></i>
            </button>

            <button
                onclick={() => playerStore.skipNext()}
                class="flex h-12 w-12 items-center justify-center text-3xl text-neutral-700 active:scale-90"
            >
                <i class="bx bx-skip-next"></i>
            </button>

            <button
                onclick={openQueueFromOverlay}
                class="flex h-12 w-12 items-center justify-center text-2xl text-[var(--color-text-muted)] active:scale-90"
            >
                <i class="bx bx-list-ul"></i>
            </button>
        </div>
    </div>
</div>

<style>
    .marquee {
        animation: marquee 12s linear infinite;
    }

    @keyframes marquee {
        0%,
        15% {
            transform: translateX(0);
        }
        100% {
            transform: translateX(-50%);
        }
    }

    :global(::view-transition-old(album-art)),
    :global(::view-transition-new(album-art)) {
        animation-duration: 0.35s;
    }
</style>
