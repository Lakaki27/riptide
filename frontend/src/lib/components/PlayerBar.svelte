<script lang="ts">
    import { playerStore } from "$lib/stores/player";
    import { apiFetch } from "$lib/api";
    import { mobileQueueOpen } from "$lib/stores/ui";
    import { goto } from "$app/navigation";

    let audioEl: HTMLAudioElement;
    let currentTime = $state(0);
    let loadedUrl = $state<string | null>(null);
    let isPlaying = $state(false);
    let titleEl: HTMLElement;
    let titleContainerEl: HTMLElement;
    let titleOverflows = $state(false);
    let playRecorded = $state(false);
    let expanded = $state(false);
    let volume = $state(1);
    let showVolumeSlider = $state(false);

    let dragStartY = $state<number | null>(null);
    let dragStartX = $state<number | null>(null);
    let dragOffsetY = $state(0);
    let imgOffsetX = $state(0);
    let dragging = $state(false);
    let axisLocked = $state<"none" | "vertical" | "horizontal">("none");

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
        playRecorded = false;
        queueMicrotask(() => {
            if (titleEl && titleContainerEl) {
                titleOverflows =
                    titleEl.scrollWidth > titleContainerEl.clientWidth;
            }
        });
    });

    $effect(() => {
        if (!track) return;
        if (playRecorded) return;
        if (currentTime >= track.durationSeconds * 0.1) {
            playRecorded = true;
            apiFetch("/stats/plays", {
                method: "POST",
                body: JSON.stringify({ musicId: track.id }),
            }).catch(() => {});
        }
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

    function stop(e: Event) {
        e.stopPropagation();
    }

    function setExpanded(value: boolean) {
        const doc = document as Document & {
            startViewTransition?: (cb: () => void) => void;
        };
        if (doc.startViewTransition) {
            doc.startViewTransition(() => {
                expanded = value;
            });
        } else {
            expanded = value;
        }
    }

    function openQueueFromOverlay() {
        setExpanded(false);
        $mobileQueueOpen = true;
    }

    function onBarTouchStart(e: TouchEvent) {
        dragStartY = e.touches[0].clientY;
        dragging = true;
    }

    function onBarTouchMove(e: TouchEvent) {
        if (dragStartY === null) return;
        const delta = e.touches[0].clientY - dragStartY;
        if (delta < 0) dragOffsetY = delta;
    }

    function onBarTouchEnd() {
        dragging = false;
        if (dragOffsetY < -50) {
            setExpanded(true);
        }
        dragOffsetY = 0;
        dragStartY = null;
    }

    function onOverlayTouchStart(e: TouchEvent) {
        dragStartY = e.touches[0].clientY;
        dragStartX = e.touches[0].clientX;
        dragging = true;
        axisLocked = "none";
    }

    function onOverlayTouchMove(e: TouchEvent) {
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

    function onOverlayTouchEnd() {
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

    function isTypingTarget(el: EventTarget | null): boolean {
        if (!(el instanceof HTMLElement)) return false;
        const tag = el.tagName;
        return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.code !== "Space") return;
        if (isTypingTarget(e.target)) return;
        if (!track) return;

        e.preventDefault();
        togglePlayback();
    }

    function goToArtist() {
        if (!track) return;
        setExpanded(false);
        goto(`/artists/${track.artist.id}`);
    }
</script>

<audio
    bind:this={audioEl}
    bind:currentTime
    onended={() => playerStore.next()}
    onplay={() => (isPlaying = true)}
    onpause={() => (isPlaying = false)}
></audio>

<svelte:window onkeydown={onKeydown} />

{#if track}
    <div
        onclick={() => setExpanded(true)}
        onkeydown={(e) => e.key === "Enter" && setExpanded(true)}
        ontouchstart={onBarTouchStart}
        ontouchmove={onBarTouchMove}
        ontouchend={onBarTouchEnd}
        role="button"
        tabindex="0"
        style="transform: translateY({Math.max(
            dragOffsetY,
            -30,
        )}px); transition: {dragging ? 'none' : 'transform 0.2s ease'};"
        class="flex w-full items-center gap-3 border-t border-violet-100 bg-white px-3 py-3 text-left md:gap-6 md:px-6 md:py-3"
    >
        <img
            src={track.thumbnailUrl ?? "/placeholder.png"}
            alt=""
            style={expanded ? "" : "view-transition-name: album-art;"}
            class="h-12 w-12 shrink-0 rounded-lg {expanded
                ? 'hidden md:block'
                : ''}"
        />

        <div
            bind:this={titleContainerEl}
            class="flex min-w-0 flex-1 flex-col overflow-hidden md:w-72 md:flex-none"
        >
            <div class="overflow-hidden whitespace-nowrap">
                <span
                    bind:this={titleEl}
                    class="inline-block text-base text-neutral-900 md:text-sm {titleOverflows
                        ? 'marquee'
                        : ''}"
                >
                    {track.title}
                </span>
            </div>
            <span class="truncate text-sm text-neutral-500"
                >{track.artist.name}</span
            >
        </div>

        <div class="hidden flex-1 items-center gap-2 md:flex">
            <span class="text-sm text-neutral-500"
                >{formatTime(currentTime)}</span
            >
            <input
                type="range"
                min="0"
                max={track.durationSeconds}
                bind:value={currentTime}
                onchange={() => (audioEl.currentTime = currentTime)}
                onclick={stop}
                class="flex-1 accent-violet-500"
            />
            <span class="text-sm text-neutral-500"
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
                    class="text-xl text-neutral-500 hover:text-violet-600"
                >
                    <i class="bx {volumeIcon()}"></i>
                </button>

                {#if showVolumeSlider}
                    <div
                        class="absolute bottom-full left-1/2 -translate-x-1/2 pb-2"
                        onclick={stop}
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
                onclick={(e) => {
                    stop(e);
                    cycleMode();
                }}
                class="hidden text-lg transition-colors md:block {$playerStore.mode ===
                'normal'
                    ? 'text-neutral-400 hover:text-neutral-600'
                    : 'text-violet-600'}"
                title={modeLabel[$playerStore.mode]}
            >
                <i class="bx {modeIcon[$playerStore.mode]}"></i>
            </button>

            <button
                onclick={(e) => {
                    stop(e);
                    playerStore.previous();
                }}
                class="text-3xl text-neutral-500 transition-colors hover:text-violet-600 active:scale-90"
            >
                <i class="bx bx-skip-previous"></i>
            </button>

            <button
                onclick={(e) => {
                    stop(e);
                    togglePlayback();
                }}
                class="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500 text-3xl text-white transition-all hover:bg-violet-600 active:scale-90"
            >
                <i class="bx {isPlaying ? 'bx-pause' : 'bx-play'}"></i>
            </button>

            <button
                onclick={(e) => {
                    stop(e);
                    playerStore.skipNext();
                }}
                class="text-3xl text-neutral-500 transition-colors hover:text-violet-600 active:scale-90"
            >
                <i class="bx bx-skip-next"></i>
            </button>
        </div>
    </div>
{/if}

{#if expanded && track}
    <div
        class="fixed inset-0 z-50 flex flex-col bg-violet-50 md:hidden"
        style="transform: translateY({dragOffsetY}px); transition: {dragging
            ? 'none'
            : 'transform 0.2s ease'};"
        ontouchstart={onOverlayTouchStart}
        ontouchmove={onOverlayTouchMove}
        ontouchend={onOverlayTouchEnd}
    >
        <div class="flex items-center justify-between p-4">
            <button
                onclick={() => setExpanded(false)}
                class="text-3xl text-neutral-500 active:scale-90"
            >
                <i class="bx bx-chevron-down"></i>
            </button>
            <span class="text-sm font-medium text-neutral-500">Now Playing</span
            >
            <div class="w-8"></div>
        </div>

        <div
            class="flex flex-1 flex-col items-center justify-center gap-8 px-8"
        >
            <img
                src={track.thumbnailUrl ?? "/placeholder.png"}
                alt=""
                style="view-transition-name: album-art; transform: translateX({imgOffsetX}px); transition: {dragging
                    ? 'none'
                    : 'transform 0.18s ease'};"
                class="aspect-square w-full max-w-xs rounded-2xl object-cover shadow-xl"
            />

            <div class="flex w-full flex-col items-center gap-1 text-center">
                <span class="text-xl font-semibold text-neutral-900"
                    >{track.title}</span
                >
                <button
                    onclick={goToArtist}
                    class="text-base text-neutral-500 hover:text-violet-600"
                >
                    {track.artist.name}
                </button>
            </div>

            <div class="flex w-full flex-col gap-2">
                <input
                    type="range"
                    min="0"
                    max={track.durationSeconds}
                    bind:value={currentTime}
                    onchange={() => (audioEl.currentTime = currentTime)}
                    class="w-full accent-violet-500"
                />
                <div class="flex justify-between text-sm text-neutral-500">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(track.durationSeconds)}</span>
                </div>
            </div>

            <div class="flex w-full items-center justify-between gap-2 px-2">
                <button
                    onclick={cycleMode}
                    class="flex h-12 w-12 items-center justify-center text-2xl transition-colors active:scale-90 {$playerStore.mode ===
                    'normal'
                        ? 'text-neutral-400'
                        : 'text-violet-600'}"
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
                    class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-violet-500 text-3xl text-white transition-all active:scale-90"
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
                    class="flex h-12 w-12 items-center justify-center text-2xl text-neutral-500 transition-colors active:scale-90"
                >
                    <i class="bx bx-list-ul"></i>
                </button>
            </div>
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

    :global(::view-transition-old(album-art)),
    :global(::view-transition-new(album-art)) {
        animation-duration: 0.35s;
    }
</style>
