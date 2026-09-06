<script lang="ts">
    import type { Pathname } from "$app/types";
    import { resolve } from "$app/paths";
    import { locales, localizeHref } from "$lib/paraglide/runtime";
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { fly } from "svelte/transition";
    import { authStore } from "$lib/stores/auth";
    import { apiFetch } from "$lib/api";
    import PlayerBar from "$lib/components/player/PlayerBar.svelte";
    import Sidebar from "$lib/components/Sidebar.svelte";
    import QueuePanel from "$lib/components/QueuePanel.svelte";
    import DownloadToasts from "$lib/components/DownloadToasts.svelte";
    import "../app.css";
    import ActionToasts from "$lib/components/ActionToasts.svelte";

    let { children } = $props();
    let ready = $state(false);

    onMount(async () => {
        const { authEnabled } = await apiFetch<{ authEnabled: boolean }>(
            "/config",
            { skipAuth: true },
        );

        authStore.setAuthEnabled(authEnabled);

        const auth = $authStore;

        if (authEnabled && !auth.accessToken && page.url.pathname !== "/auth") {
            goto("/auth");
        }

        ready = true;
    });
</script>

{#if ready}
    {#if page.url.pathname === "/auth"}
        {@render children()}
    {:else}
        <div class="flex h-screen flex-col bg-violet-50 text-neutral-900">
            <div class="flex flex-1 overflow-hidden">
                <div class="hidden md:flex"><Sidebar /></div>

                <main class="flex-1 overflow-y-auto p-4 md:p-6">
                    {#key page.url.pathname}
                        <div
                            in:fly={{ x: 12, duration: 180, delay: 80 }}
                            out:fly={{ x: -12, duration: 120 }}
                        >
                            {@render children()}
                        </div>
                    {/key}
                </main>

                <QueuePanel />
            </div>

            <PlayerBar />
            <div class="md:hidden"><Sidebar /></div>
        </div>

        <DownloadToasts />
        <ActionToasts />
    {/if}
{/if}

<div style="display:none">
    {#each locales as locale (locale)}
        <a
            href={resolve(
                localizeHref(page.url.pathname, { locale }) as Pathname,
            )}>{locale}</a
        >
    {/each}
</div>
