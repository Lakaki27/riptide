<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { page } from "$app/state";
    import { apiFetch } from "$lib/api";
    import DownloadToasts from "$lib/components/DownloadToasts.svelte";
    import PlayerBar from "$lib/components/PlayerBar.svelte";
    import QueuePanel from "$lib/components/QueuePanel.svelte";
    import Sidebar from "$lib/components/Sidebar.svelte";
    import { authStore } from "$lib/stores/auth";
    import "../app.css";

    let { children } = $props();
    let ready = $state(false);

    onMount(async () => {
        const { authEnabled } = await apiFetch<{ authEnabled: boolean }>(
            "/config",
            {
                skipAuth: true,
            },
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
                <Sidebar />
                <main class="flex-1 overflow-y-auto p-6">
                    {@render children()}
                </main>
                <QueuePanel />
            </div>
            <PlayerBar />
        </div>
        <DownloadToasts />
    {/if}
{/if}
