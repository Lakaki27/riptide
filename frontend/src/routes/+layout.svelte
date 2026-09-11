<script lang="ts">
    import { onMount } from "svelte";
    import { fly } from "svelte/transition";
    import { goto } from "$app/navigation";
    import { resolve } from "$app/paths";
    import { page } from "$app/state";
    import type { Pathname } from "$app/types";
    import { apiFetch } from "$lib/api";
    import DownloadToasts from "$lib/components/DownloadToasts.svelte";
    import PlayerBar from "$lib/components/player/PlayerBar.svelte";
    import QueuePanel from "$lib/components/QueuePanel.svelte";
    import Sidebar from "$lib/components/Sidebar.svelte";
    import { locales, localizeHref, setLocale } from "$lib/paraglide/runtime";
    import { authStore } from "$lib/stores/auth";
    import "../app.css";
    import ActionToasts from "$lib/components/ActionToasts.svelte";
    import { themeStore } from "$lib/stores/theme";

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

        themeStore.init();

        if (auth.accessToken) {
            try {
                const me = await apiFetch<{ theme: string; language: string }>(
                    "/auth/me",
                );
                themeStore.set(me.theme as "light" | "dark" | "system");
                setLocale(me.language as "en" | "fr");
            } catch {
                // handled by apiFetch's own redirect-on-failed-refresh
            }
        }

        ready = true;
    });
</script>

{#if ready}
    {#if page.url.pathname === "/auth"}
        {@render children()}
    {:else}
        <div class="flex h-screen flex-col text-[var(--color-text-primary)] bg-[var(--color-bg)]">
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
