<script lang="ts">
import { onMount } from "svelte";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import { apiFetch } from "$lib/api";
import PlayerBar from "$lib/components/PlayerBar.svelte";
import Sidebar from "$lib/components/Sidebar.svelte";
import { authStore } from "$lib/stores/auth";
import "../../app.css";

let { children } = $props();
let ready = $state(false);

onMount(async () => {
	const { authEnabled } = await apiFetch<{ authEnabled: boolean }>("/config", {
		skipAuth: true,
	});
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
        <div class="flex h-screen bg-violet-50 text-neutral-900">
            <Sidebar />
            <div class="flex flex-1 flex-col overflow-hidden">
                <main class="flex-1 overflow-y-auto p-6">
                    {@render children()}
                </main>
                <PlayerBar />
            </div>
        </div>
    {/if}
{/if}
