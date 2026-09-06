<script lang="ts">
    import { playerStore } from "$lib/stores/player";
    import { apiFetch } from "$lib/api";
    import { mobileQueueOpen } from "$lib/stores/ui";
    import ExpandedPlayer from "./ExpandedPlayer.svelte";
    import MiniBar from "./MiniBar.svelte";

    let audioEl: HTMLAudioElement;
    let currentTime = $state(0);
    let loadedUrl = $state<string | null>(null);
    let isPlaying = $state(false);
    let playRecorded = $state(false);
    let expanded = $state(false);

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
        playRecorded = false;
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

    function togglePlayback() {
        if (audioEl.paused) {
            audioEl.play();
        } else {
            audioEl.pause();
        }
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
    <MiniBar
        {track}
        {currentTime}
        {isPlaying}
        {expanded}
        {audioEl}
        {togglePlayback}
        {setExpanded}
    />
{/if}

{#if expanded && track}
    <ExpandedPlayer
        {track}
        {currentTime}
        {isPlaying}
        {audioEl}
        {togglePlayback}
        {setExpanded}
        {openQueueFromOverlay}
    />
{/if}
