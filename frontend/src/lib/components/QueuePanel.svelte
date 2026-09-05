<script lang="ts">
    import { goto } from "$app/navigation";
    import { playerStore } from "$lib/stores/player";
    import { mobileQueueOpen } from "$lib/stores/ui";
    import MusicList from "$lib/components/MusicList.svelte";
    import type { Music } from "$lib/types";

    let searchQuery = $state("");
    let scrollContainer: HTMLElement;

    const indexedQueue = $derived(
        $playerStore.queue.map((music, index) => ({ music, index })),
    );

    const filteredIndexed = $derived(
        searchQuery.trim()
            ? indexedQueue.filter(
                  ({ music }) =>
                      music.title
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()) ||
                      music.artist.name
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()),
              )
            : indexedQueue,
    );

    const filteredMusics = $derived(filteredIndexed.map((x) => x.music));

    function handlePlay(filteredIndex: number) {
        const realIndex = filteredIndexed[filteredIndex]?.index;
        if (realIndex !== undefined) playerStore.jumpTo(realIndex);
    }

    function handleTitleNavigate(music: Music) {
        $mobileQueueOpen = false;
        goto(`/artists/${music.artist.id}`);
    }

    $effect(() => {
        const current = $playerStore.currentIndex;
        if (!scrollContainer) return;
        const isScrollable =
            scrollContainer.scrollHeight > scrollContainer.clientHeight;
        if (!isScrollable) return;
        const rowHeight = 48;
        const targetTop =
            filteredIndexed.findIndex((x) => x.index === current) * rowHeight;
        scrollContainer.scrollTo({ top: targetTop, behavior: "smooth" });
    });
</script>

{#if $mobileQueueOpen}
    <div class="fixed inset-0 z-40 flex items-end bg-black/30 md:hidden">
        <div
            class="flex h-3/4 w-full flex-col gap-3 rounded-t-2xl bg-white p-4"
        >
            <div class="flex items-center justify-between">
                <h2 class="text-sm font-medium text-neutral-900">
                    Playing next
                </h2>
                <button
                    onclick={() => ($mobileQueueOpen = false)}
                    class="text-neutral-500"
                >
                    <i class="bx bx-x text-2xl"></i>
                </button>
            </div>
            <input
                bind:value={searchQuery}
                placeholder="Search queue"
                class="rounded-lg border border-violet-100 px-3 py-2 text-sm"
            />
            <div class="flex-1 overflow-y-auto">
                <MusicList
                    musics={filteredMusics}
                    activeIndex={filteredIndexed.findIndex(
                        (x) => x.index === $playerStore.currentIndex,
                    )}
                    compact={true}
                    showMenu={false}
                    onPlay={handlePlay}
                    onTitleNavigate={handleTitleNavigate}
                />
            </div>
        </div>
    </div>
{/if}

<aside
    class="hidden w-72 flex-col gap-3 border-l border-violet-100 bg-white p-4 md:flex"
>
    <h2 class="text-sm font-medium text-neutral-900">Playing next</h2>
    <input
        bind:value={searchQuery}
        placeholder="Search queue"
        class="rounded-lg border border-violet-100 px-3 py-2 text-sm"
    />
    <div bind:this={scrollContainer} class="flex-1 overflow-y-auto">
        <MusicList
            musics={filteredMusics}
            activeIndex={filteredIndexed.findIndex(
                (x) => x.index === $playerStore.currentIndex,
            )}
            compact={true}
            showMenu={false}
            onPlay={handlePlay}
        />
    </div>
</aside>
