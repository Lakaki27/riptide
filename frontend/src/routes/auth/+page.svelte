<script lang="ts">
import { goto } from "$app/navigation";
import { authStore } from "$lib/stores/auth";

let email = $state("");
let password = $state("");
let error = $state("");
let loading = $state(false);

async function handleSubmit(e: Event) {
	e.preventDefault();
	error = "";
	loading = true;

	try {
		await authStore.login(email, password);
		goto("/");
	} catch {
		error = "Invalid email or password";
	} finally {
		loading = false;
	}
}
</script>

<div class="flex h-screen items-center justify-center bg-violet-50">
    <form onsubmit={handleSubmit} class="flex w-80 flex-col gap-3 rounded-lg bg-white p-6 shadow-sm">
        <h1 class="mb-2 text-xl text-neutral-900">Sign in</h1>

        <input
            type="email"
            bind:value={email}
            placeholder="Email"
            required
            class="rounded-lg border border-violet-100 px-3 py-2 text-sm"
        />
        <input
            type="password"
            bind:value={password}
            placeholder="Password"
            required
            class="rounded-lg border border-violet-100 px-3 py-2 text-sm"
        />

        {#if error}
            <span class="text-sm text-red-500">{error}</span>
        {/if}

        <button
            type="submit"
            disabled={loading}
            class="rounded-lg bg-violet-500 px-3 py-2 text-sm text-white hover:bg-violet-600 disabled:opacity-50"
        >
            {loading ? "Signing in..." : "Sign in"}
        </button>
    </form>
</div>
