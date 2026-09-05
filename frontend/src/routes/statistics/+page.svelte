<script lang="ts">
    import { onMount } from "svelte";
    import { apiFetch } from "$lib/api";

    interface TopSong {
        musicId: string;
        title: string;
        playCount: string;
    }

    interface TopArtist {
        artistId: string;
        name: string;
        playCount: string;
    }

    interface HeatmapDay {
        date: string;
        count: number;
    }

    let topSongs = $state<TopSong[]>([]);
    let topArtists = $state<TopArtist[]>([]);
    let heatmap = $state<HeatmapDay[]>([]);
    let loading = $state(true);

    const heatmapByDate = $derived(
        new Map(heatmap.map((d) => [d.date, d.count])),
    );

    const weeks = $derived.by(() => {
        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - 364);
        start.setDate(start.getDate() - start.getDay());

        const days: { date: string; count: number }[] = [];
        const cursor = new Date(start);

        while (cursor <= today) {
            const iso = cursor.toISOString().slice(0, 10);
            days.push({ date: iso, count: heatmapByDate.get(iso) ?? 0 });
            cursor.setDate(cursor.getDate() + 1);
        }

        const result: { date: string; count: number }[][] = [];
        for (let i = 0; i < days.length; i += 7) {
            result.push(days.slice(i, i + 7));
        }
        return result;
    });

    function intensity(count: number): string {
        if (count === 0) return "bg-violet-100";
        if (count < 3) return "bg-violet-300";
        if (count < 6) return "bg-violet-500";
        if (count < 10) return "bg-violet-700";
        return "bg-violet-900";
    }

    let loadError = $state<string | null>(null);

    onMount(async () => {
        try {
            const [songsData, artistsData, heatmapData] = await Promise.all([
                apiFetch<{ results: TopSong[] }>("/stats/top-songs?limit=100"),
                apiFetch<{ results: TopArtist[] }>(
                    "/stats/top-artists?limit=100",
                ),
                apiFetch<{ results: HeatmapDay[] }>("/stats/heatmap?days=365"),
            ]);
            topSongs = songsData.results;
            topArtists = artistsData.results;
            heatmap = heatmapData.results;
        } catch (err) {
            console.error("stats load failed:", err);
            loadError =
                err instanceof Error ? err.message : "failed to load stats";
        } finally {
            loading = false;
        }
    });
</script>

<div class="flex flex-col gap-6 md:gap-8">
    <h1 class="text-xl text-neutral-900">Statistics</h1>

    {#if loading}
        <div
            class="flex h-40 items-center justify-center text-sm text-neutral-400"
        >
            Loading...
        </div>
    {:else if loadError}
        <div class="flex h-40 items-center justify-center text-sm text-red-500">
            {loadError}
        </div>
    {:else}
        <div class="flex flex-col gap-2">
            <h2 class="text-sm font-medium text-neutral-900">
                Listening activity
            </h2>
            <div
                class="overflow-x-auto rounded-xl bg-white p-3 shadow-sm md:p-4"
            >
                <div class="flex w-fit gap-1">
                    {#each weeks as week}
                        <div class="flex flex-col gap-1">
                            {#each week as day}
                                <div
                                    class="h-2.5 w-2.5 rounded-sm md:h-3 md:w-3 {intensity(
                                        day.count,
                                    )}"
                                    title="{day.date}: {day.count} play{day.count ===
                                    1
                                        ? ''
                                        : 's'}"
                                ></div>
                            {/each}
                        </div>
                    {/each}
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div class="flex flex-col gap-2">
                <h2 class="text-sm font-medium text-neutral-900">Top songs</h2>
                <div
                    class="flex flex-col gap-0.5 rounded-xl bg-white p-2 shadow-sm"
                >
                    {#each topSongs as song, i}
                        <div
                            class="flex items-center gap-3 rounded-lg px-2 py-2"
                        >
                            <span class="w-6 shrink-0 text-sm text-neutral-400"
                                >{i + 1}</span
                            >
                            <span
                                class="flex-1 truncate text-sm text-neutral-900"
                                >{song.title}</span
                            >
                            <span class="shrink-0 text-sm text-neutral-500"
                                >{song.playCount}</span
                            >
                        </div>
                    {:else}
                        <div
                            class="px-2 py-4 text-center text-sm text-neutral-400"
                        >
                            No plays yet
                        </div>
                    {/each}
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <h2 class="text-sm font-medium text-neutral-900">
                    Top artists
                </h2>
                <div
                    class="flex flex-col gap-0.5 rounded-xl bg-white p-2 shadow-sm"
                >
                    {#each topArtists as artist, i}
                        <div
                            class="flex items-center gap-3 rounded-lg px-2 py-2"
                        >
                            <span class="w-6 shrink-0 text-sm text-neutral-400"
                                >{i + 1}</span
                            >
                            <span
                                class="flex-1 truncate text-sm text-neutral-900"
                                >{artist.name}</span
                            >
                            <span class="shrink-0 text-sm text-neutral-500"
                                >{artist.playCount}</span
                            >
                        </div>
                    {:else}
                        <div
                            class="px-2 py-4 text-center text-sm text-neutral-400"
                        >
                            No plays yet
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
</div>
