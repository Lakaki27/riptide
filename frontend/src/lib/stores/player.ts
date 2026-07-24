import { get, writable } from "svelte/store";
import { apiFetch } from "$lib/api";
import type { Music } from "$lib/types";

type PlayMode = "normal" | "loop-song" | "loop-playlist";

interface PlayerState {
	queue: Music[];
	currentIndex: number;
	audioUrl: string | null;
	isPlaying: boolean;
	mode: PlayMode;
}

function createPlayerStore() {
	const { subscribe, set, update } = writable<PlayerState>({
		queue: [],
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

	return {
		subscribe,
		setQueue(tracks: Music[], startIndex = 0) {
			update((s) => ({ ...s, queue: tracks }));
			playIndex(startIndex);
		},
		playNext(track: Music) {
			update((s) => {
				const withoutTrack = s.queue.filter((t) => t.id !== track.id);
				const insertAt = s.currentIndex + 1;
				withoutTrack.splice(insertAt, 0, track);
				return { ...s, queue: withoutTrack };
			});
		},
		next() {
			const state = get(playerStore);
			if (state.mode === "loop-song") {
				playIndex(state.currentIndex);
				return;
			}
			const nextIndex = state.currentIndex + 1;
			if (nextIndex < state.queue.length) {
				playIndex(nextIndex);
			} else if (state.mode === "loop-playlist") {
				playIndex(0);
			} else {
				update((s) => ({ ...s, isPlaying: false }));
			}
		},
		previous() {
			const state = get(playerStore);
			if (state.currentIndex > 0) {
				playIndex(state.currentIndex - 1);
			}
		},
		setMode(mode: PlayMode) {
			update((s) => ({ ...s, mode }));
		},
		togglePlay() {
			update((s) => ({ ...s, isPlaying: !s.isPlaying }));
		},
	};
}

export const playerStore = createPlayerStore();
