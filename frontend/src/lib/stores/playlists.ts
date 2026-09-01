import { writable } from "svelte/store";
import { apiFetch } from "$lib/api";
import type { Playlist } from "$lib/types";

function createPlaylistsStore() {
    const { subscribe, set } = writable<Playlist[]>([]);
    let loaded = false;

    return {
        subscribe,
        async ensureLoaded() {
            if (loaded) return;
            const data = await apiFetch<Playlist[]>("/playlists");
            set(data);
            loaded = true;
        },
        async refresh() {
            const data = await apiFetch<Playlist[]>("/playlists");
            set(data);
            loaded = true;
        },
    };
}

export const playlistsStore = createPlaylistsStore();
