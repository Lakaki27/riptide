import { get, writable } from "svelte/store";
import { apiFetch } from "$lib/api";
import type { Music } from "$lib/types";

type PlayMode = "normal" | "loop-song" | "loop-playlist" | "randomize";

interface PlayerState {
    queue: Music[];
    originalQueue: Music[];
    currentIndex: number;
    audioUrl: string | null;
    isPlaying: boolean;
    mode: PlayMode;
}

function shuffle<T>(items: T[]): T[] {
    const remaining = [...items];
    const result: T[] = [];
    while (remaining.length > 0) {
        const index = Math.floor(Math.random() * remaining.length);
        const [picked] = remaining.splice(index, 1);
        if (picked !== undefined) result.push(picked);
    }
    return result;
}

function createPlayerStore() {
    const { subscribe, update } = writable<PlayerState>({
        queue: [],
        originalQueue: [],
        currentIndex: -1,
        audioUrl: null,
        isPlaying: false,
        mode: "normal",
    });

    async function playIndex(index: number) {
        const state = get(playerStore);
        const track = state.queue[index];
        if (!track) return;

        const { url } = await apiFetch<{ url: string }>(
            `/musics/${track.id}/stream-url`,
        );
        update((s) => ({
            ...s,
            currentIndex: index,
            audioUrl: url,
            isPlaying: true,
        }));
    }

    function advance() {
        const state = get(playerStore);
        const nextIndex = state.currentIndex + 1;

        if (nextIndex < state.queue.length) {
            playIndex(nextIndex);
            return;
        }

        if (state.mode === "loop-playlist") {
            playIndex(0);
            return;
        }

        if (state.mode === "randomize") {
            update((s) => ({ ...s, queue: shuffle(s.queue) }));
            playIndex(0);
            return;
        }

        update((s) => ({ ...s, isPlaying: false }));
    }

    return {
        subscribe,
        setQueue(tracks: Music[], startIndex = 0) {
            const state = get(playerStore);
            const queue = state.mode === "randomize" ? shuffle(tracks) : tracks;
            update((s) => ({ ...s, queue, originalQueue: tracks }));
            const actualStart = queue.findIndex(
                (t) => t.id === tracks[startIndex]?.id,
            );
            playIndex(actualStart >= 0 ? actualStart : 0);
        },
        addToQueue(track: Music) {
            update((s) => {
                const alreadyQueued = s.queue.some((t) => t.id === track.id);
                if (alreadyQueued) return s;
                return {
                    ...s,
                    queue: [...s.queue, track],
                    originalQueue: [...s.originalQueue, track],
                };
            });
        },
        playNext(track: Music) {
            update((s) => {
                const currentTrack = s.queue[s.currentIndex];
                const withoutTrack = s.queue.filter((t) => t.id !== track.id);
                const newCurrentIndex = currentTrack
                    ? withoutTrack.findIndex((t) => t.id === currentTrack.id)
                    : -1;
                const insertAt = newCurrentIndex + 1;
                withoutTrack.splice(insertAt, 0, track);
                return {
                    ...s,
                    queue: withoutTrack,
                    currentIndex:
                        newCurrentIndex >= 0 ? newCurrentIndex : s.currentIndex,
                };
            });
        },
        jumpTo(index: number) {
            playIndex(index);
        },
        next() {
            const state = get(playerStore);

            if (state.mode === "loop-song") {
                playIndex(state.currentIndex);
                return;
            }

            advance();
        },
        skipNext() {
            advance();
        },
        previous() {
            const state = get(playerStore);
            if (state.currentIndex > 0) {
                playIndex(state.currentIndex - 1);
            }
        },
        setMode(mode: PlayMode) {
            update((s) => {
                if (mode === "randomize") {
                    const currentTrack = s.queue[s.currentIndex];
                    const shuffled = shuffle(s.queue);
                    const newIndex = currentTrack
                        ? shuffled.findIndex((t) => t.id === currentTrack.id)
                        : 0;
                    return {
                        ...s,
                        mode,
                        queue: shuffled,
                        currentIndex: newIndex,
                    };
                }

                if (s.mode === "randomize") {
                    const currentTrack = s.queue[s.currentIndex];
                    const newIndex = currentTrack
                        ? s.originalQueue.findIndex(
                              (t) => t.id === currentTrack.id,
                          )
                        : 0;
                    return {
                        ...s,
                        mode,
                        queue: s.originalQueue,
                        currentIndex: newIndex,
                    };
                }

                return { ...s, mode };
            });
        },
        togglePlay() {
            update((s) => ({ ...s, isPlaying: !s.isPlaying }));
        },
    };
}

export const playerStore = createPlayerStore();
