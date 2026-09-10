import { get } from "svelte/store";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("$lib/api", () => ({
    apiFetch: vi.fn().mockResolvedValue({ url: "http://example.com/track.ogg" }),
}));

import { playerStore } from "../src/lib/stores/player";

import type { Music } from "../src/lib/types";

const track = (id: string): Music => ({
    id,
    title: `Song ${id}`,
    artist: {
        id: "a1",
        name: "Artist",
        createdAt: "",
    },
    durationSeconds: 100,
    createdAt: "",
    thumbnailUrl: null,
    codec: null,
    bitrateKbps: null,
    sampleRateHz: null,
});

describe("playerStore", () => {
    beforeEach(() => {
        playerStore.setMode("normal");
    });

    it("does not add a track to the queue if it is already present", () => {
        const t = track("1");
        playerStore.addToQueue(t);
        playerStore.addToQueue(t);
        expect(get(playerStore).queue.filter((x) => x.id === "1")).toHaveLength(1);
    });

    it("cycles through modes without landing on an invalid index", () => {
        const modes: string[] = [];
        for (let i = 0; i < 5; i++) {
            playerStore.setMode(
                (["normal", "loop-song", "loop-playlist", "randomize"] as const)[i % 4],
            );
            modes.push(get(playerStore).mode);
        }
        expect(modes).toEqual(["normal", "loop-song", "loop-playlist", "randomize", "normal"]);
    });

    it("playNext inserts a track right after the current one without losing currentIndex", async () => {
        await playerStore.setQueue([track("1"), track("2"), track("3")], 0);
        playerStore.playNext(track("4"));
        const state = get(playerStore);
        expect(state.queue.map((t) => t.id)).toEqual(["1", "4", "2", "3"]);
        expect(state.queue[state.currentIndex].id).toBe("1");
    });
});
