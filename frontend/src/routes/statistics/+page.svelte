<script lang="ts">
    import { onMount } from "svelte";
    import { apiFetch } from "$lib/api";
    import { m } from "$lib/paraglide/messages";

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

    interface HeatmapResponse {
        results: HeatmapDay[];
        startDate: string;
        endDate: string;
    }

    let topSongs = $state<TopSong[]>([]);
    let topArtists = $state<TopArtist[]>([]);
    let heatmapDays = $state<{ date: string; count: number }[]>([]);
    let earliestDate = $state<string | null>(null);
    let selectedRange = $state<"month" | "year" | "all">("year");
    let selectedYear = $state(new Date().getFullYear());
    let loading = $state(true);
    let heatmapLoading = $state(false);
    let scrollContainer: HTMLElement;

    let tooltip = $state<{
        date: string;
        plays: string;
        x: number;
        y: number;
    } | null>(null);

    const dateFormatter = new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    function formatDateLong(iso: string): string {
        const [y, m, d] = iso.split("-").map(Number);
        return dateFormatter.format(new Date(y, m - 1, d));
    }

    function toDateString(date: Date): string {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    const availableYears = $derived.by(() => {
        if (!earliestDate) return [new Date().getFullYear()];
        const startYear = Number(earliestDate.slice(0, 4));
        const currentYear = new Date().getFullYear();
        const years: number[] = [];
        for (let y = currentYear; y >= startYear; y--) years.push(y);
        return years;
    });

    const weeks = $derived.by(() => {
        if (heatmapDays.length === 0) return [];

        const first = heatmapDays[0].date;
        const last = heatmapDays[heatmapDays.length - 1].date;

        const [fy, fm, fd] = first.split("-").map(Number);
        const [ly, lm, ld] = last.split("-").map(Number);

        const countByDate = new Map(heatmapDays.map((d) => [d.date, d.count]));

        const start = new Date(fy, fm - 1, fd);
        start.setDate(start.getDate() - start.getDay());

        const end = new Date(ly, lm - 1, ld);

        const days: { date: string; count: number }[] = [];
        const cursor = new Date(start);

        while (cursor <= end) {
            const iso = toDateString(cursor);
            days.push({ date: iso, count: countByDate.get(iso) ?? 0 });
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

    function fillGaps(
        startDate: string,
        endDate: string,
        results: HeatmapDay[],
    ) {
        const countByDate = new Map(results.map((d) => [d.date, d.count]));
        const [sy, sm, sd] = startDate.split("-").map(Number);
        const [ey, em, ed] = endDate.split("-").map(Number);
        const cursor = new Date(sy, sm - 1, sd);
        const end = new Date(ey, em - 1, ed);
        const days: { date: string; count: number }[] = [];

        while (cursor <= end) {
            const iso = toDateString(cursor);
            days.push({ date: iso, count: countByDate.get(iso) ?? 0 });
            cursor.setDate(cursor.getDate() + 1);
        }
        return days;
    }

    function computeRange(): { startDate: string; endDate: string } {
        const today = new Date();
        const endDate = toDateString(today);

        if (selectedRange === "month") {
            return {
                startDate: toDateString(
                    new Date(today.getFullYear(), today.getMonth(), 1),
                ),
                endDate,
            };
        }
        if (selectedRange === "year") {
            return { startDate: `${selectedYear}-01-01`, endDate };
        }
        return { startDate: earliestDate ?? endDate, endDate };
    }

    async function loadHeatmap() {
        heatmapLoading = true;
        const { startDate, endDate } = computeRange();
        const data = await apiFetch<HeatmapResponse>(
            `/stats/heatmap?startDate=${startDate}&endDate=${endDate}`,
        );
        heatmapDays = fillGaps(startDate, endDate, data.results);
        heatmapLoading = false;

        queueMicrotask(() => {
            if (scrollContainer) {
                scrollContainer.scrollLeft = scrollContainer.scrollWidth;
            }
        });
    }

    function showTooltip(
        e: MouseEvent | TouchEvent,
        day: { date: string; count: number },
    ) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        tooltip = {
            date: formatDateLong(day.date),
            plays: `${day.count} play${day.count === 1 ? "" : "s"}`,
            x: rect.left + rect.width / 2,
            y: rect.top,
        };
    }

    function hideTooltip() {
        tooltip = null;
    }

    onMount(async () => {
        const [songsData, artistsData, earliestData] = await Promise.all([
            apiFetch<{ results: TopSong[] }>("/stats/top-songs?limit=100"),
            apiFetch<{ results: TopArtist[] }>("/stats/top-artists?limit=100"),
            apiFetch<{ date: string | null }>("/stats/earliest-play"),
        ]);
        topSongs = songsData.results;
        topArtists = artistsData.results;
        earliestDate = earliestData.date;
        await loadHeatmap();
        loading = false;
    });
</script>

<div class="flex flex-col gap-6 md:gap-8">
    <h1 class="text-xl text-[var(--color-text-primary)]">
        {m["statistics"]()}
    </h1>

    {#if loading}
        <div
            class="flex h-40 items-center justify-center text-sm text-[var(--color-text-muted)]"
        >
            {m["loading"]()}
        </div>
    {:else}
        <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
                <h2
                    class="text-sm font-medium text-[var(--color-text-primary)]"
                >
                    {m["listening_activity"]()}
                </h2>

                <div class="flex items-center gap-2">
                    <select
                        bind:value={selectedRange}
                        onchange={loadHeatmap}
                        class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
                    >
                        <option value="month"
                            >{m["heatmap.this_month"]()}</option
                        >
                        <option value="year">{m["heatmap.this_year"]()}</option>
                        <option value="all">{m["heatmap.all_time"]()}</option>
                    </select>

                    {#if selectedRange === "year"}
                        <select
                            bind:value={selectedYear}
                            onchange={loadHeatmap}
                            class="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm"
                        >
                            {#each availableYears as year}
                                <option value={year}>{year}</option>
                            {/each}
                        </select>
                    {/if}
                </div>
            </div>

            <div
                bind:this={scrollContainer}
                class="scrollbar-hide overflow-x-auto rounded-xl bg-[var(--color-surface)] p-3 shadow-sm md:p-4"
            >
                {#if heatmapLoading}
                    <div
                        class="flex h-24 items-center justify-center text-sm text-[var(--color-text-muted)]"
                    >
                        {m["loading"]()}
                    </div>
                {:else}
                    <div class="flex w-fit gap-1">
                        {#each weeks as week}
                            <div class="flex flex-col gap-1">
                                {#each week as day}
                                    <div
                                        class="h-2.5 w-2.5 rounded-sm md:h-3 md:w-3 {intensity(
                                            day.count,
                                        )}"
                                        onmouseenter={(e) =>
                                            showTooltip(e, day)}
                                        onmouseleave={hideTooltip}
                                        ontouchstart={(e) =>
                                            showTooltip(e, day)}
                                        ontouchend={hideTooltip}
                                    ></div>
                                {/each}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>

        <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div class="flex flex-col gap-2">
                <h2
                    class="text-sm font-medium text-[var(--color-text-primary)]"
                >
                    {m["top_songs"]()}
                </h2>
                <div
                    class="flex flex-col gap-0.5 rounded-xl bg-[var(--color-surface)] p-2 shadow-sm"
                >
                    {#each topSongs as song, i}
                        <div
                            class="flex items-center gap-3 rounded-lg px-2 py-2"
                        >
                            <span
                                class="w-6 shrink-0 text-sm text-[var(--color-text-muted)]"
                                >{i + 1}</span
                            >
                            <span
                                class="flex-1 truncate text-sm text-[var(--color-text-primary)]"
                                >{song.title}</span
                            >
                            <span
                                class="shrink-0 text-sm text-[var(--color-text-muted)]"
                                >{song.playCount}</span
                            >
                        </div>
                    {:else}
                        <div
                            class="px-2 py-4 text-center text-sm text-[var(--color-text-muted)]"
                        >
                            {m["no_plays_yet"]()}
                        </div>
                    {/each}
                </div>
            </div>

            <div class="flex flex-col gap-2">
                <h2
                    class="text-sm font-medium text-[var(--color-text-primary)]"
                >
                    {m["top_artists"]()}
                </h2>
                <div
                    class="flex flex-col gap-0.5 rounded-xl bg-[var(--color-surface)] p-2 shadow-sm"
                >
                    {#each topArtists as artist, i}
                        <div
                            class="flex items-center gap-3 rounded-lg px-2 py-2"
                        >
                            <span
                                class="w-6 shrink-0 text-sm text-[var(--color-text-muted)]"
                                >{i + 1}</span
                            >
                            <span
                                class="flex-1 truncate text-sm text-[var(--color-text-primary)]"
                                >{artist.name}</span
                            >
                            <span
                                class="shrink-0 text-sm text-[var(--color-text-muted)]"
                                >{artist.playCount}</span
                            >
                        </div>
                    {:else}
                        <div
                            class="px-2 py-4 text-center text-sm text-[var(--color-text-muted)]"
                        >
                            {m["no_plays_yet"]()}
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
</div>

{#if tooltip}
    <div
        class="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-lg bg-white px-3 py-1.5 whitespace-nowrap shadow-xs"
        style="left: {tooltip.x}px; top: {tooltip.y - 8}px;"
    >
        <p class="text-xs text-neutral-500">
            {tooltip.date}
        </p>
        <p>
            {tooltip.plays}
        </p>
    </div>
{/if}

<style>
    .scrollbar-hide {
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    .scrollbar-hide::-webkit-scrollbar {
        display: none;
    }
</style>
