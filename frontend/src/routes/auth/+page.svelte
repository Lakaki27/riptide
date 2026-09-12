<script lang="ts">
import { onMount } from "svelte";
import { goto } from "$app/navigation";
import { apiFetch } from "$lib/api";
import { m } from "$lib/paraglide/messages";
import { authStore } from "$lib/stores/auth";

let email = $state("");
let password = $state("");
let error = $state("");
let loading = $state(false);
let showForgotModal = $state(false);

let resetToken = $state<string | null>(null);
let newPassword = $state("");
let confirmPassword = $state("");
let resetError = $state("");
let resetLoading = $state(false);

let minPasswordLength = $state(0);

async function handleSubmit(e: Event) {
    e.preventDefault();
    error = "";
    loading = true;

    try {
        const result = await authStore.login(email, password);
        if (result.needsPasswordReset) {
            resetToken = result.resetToken;
        } else {
            goto("/");
        }
    } catch (err) {
        error = err instanceof Error ? err.message : "Invalid email or password";
    } finally {
        loading = false;
    }
}

async function handleResetSubmit(e: Event) {
    e.preventDefault();
    resetError = "";

    if (newPassword.length < minPasswordLength) {
        resetError = `Password must be at least {minPasswordLength} characters`;
        return;
    }
    if (newPassword !== confirmPassword) {
        resetError = "Passwords do not match";
        return;
    }

    resetLoading = true;
    try {
        await authStore.completeReset(resetToken!, newPassword);
        goto("/");
    } catch (err) {
        resetError = err instanceof Error ? err.message : "Failed to reset password";
    } finally {
        resetLoading = false;
    }
}

onMount(async () => {
    const policy = await apiFetch<{ minLength: number }>("/auth/password-policy");
    minPasswordLength = policy.minLength;
});
</script>

<div class="flex h-screen items-center justify-center bg-(--color-bg)">
    {#if resetToken}
        <form
            onsubmit={handleResetSubmit}
            class="flex w-80 flex-col gap-3 rounded-xl bg-(--color-surface) p-6 shadow-sm"
        >
            <h1 class="mb-1 text-xl text-(--color-text-primary)">
                {m["set_a_new_password"]()}
            </h1>
            <p class="mb-2 text-sm text-(--color-text-muted)">
                {m["your_password_was_reset"]()}
            </p>

            <input
                type="password"
                bind:value={newPassword}
                placeholder={m["new_password"]()}
                required
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-gray-400"
            />
            <input
                type="password"
                bind:value={confirmPassword}
                placeholder={m["new_password_confirm"]()}
                required
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-gray-400"
            />

            {#if resetError}
                <span class="text-sm text-red-500">{resetError}</span>
            {/if}

            <button
                type="submit"
                disabled={resetLoading}
                class="rounded-lg bg-(--color-accent) px-3 py-2 text-sm text-white hover:bg-(--color-accent-hover) disabled:opacity-50"
            >
                {resetLoading ? m["saving"]() : m["set_password"]()}
            </button>
        </form>
    {:else}
        <form
            onsubmit={handleSubmit}
            class="flex w-80 flex-col items-center gap-3 rounded-xl bg-(--color-surface) p-6 shadow-sm"
        >
            <img
                src="/logo.png"
                alt="Riptide"
                class="mb-2 h-16 w-16 rounded-2xl"
            />
            <h1 class="mb-2 text-xl text-(--color-text-primary)">
                {m["sign_in"]()}
            </h1>

            <input
                type="email"
                bind:value={email}
                placeholder={m["email"]()}
                required
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-gray-400"
            />
            <input
                type="password"
                bind:value={password}
                placeholder={m["password"]()}
                required
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-(--color-text-primary) placeholder:text-gray-400"
            />

            {#if error}
                <span class="text-sm text-red-500">{error}</span>
            {/if}

            <button
                type="submit"
                disabled={loading}
                class="rounded-lg bg-(--color-accent) px-3 py-2 text-sm text-white hover:bg-(--color-accent-hover) disabled:opacity-50"
            >
                {loading ? m["signing_in"]() : m["sign_in"]()}
            </button>

            <button
                type="button"
                onclick={() => (showForgotModal = true)}
                class="text-sm text-(--color-text-muted) hover:text-(--color-accent)"
            >
                {m["forgot_password_q"]()}
            </button>
        </form>
    {/if}
</div>

{#if showForgotModal}
    <div class="fixed inset-0 flex items-center justify-center bg-black/20">
        <div
            class="flex w-80 flex-col gap-3 rounded-xl bg-(--color-surface) p-6"
        >
            <h2 class="text-lg text-(--color-text-primary)">
                {m["forgot_password"]()}
            </h2>
            <p class="text-sm text-(--color-text-muted)">
                {m["forgot_password_text"]()}
            </p>
            <button
                onclick={() => (showForgotModal = false)}
                class="rounded-lg bg-(--color-accent) px-3 py-2 text-sm text-white hover:bg-(--color-accent-hover)"
            >
                {m["got_it"]()}
            </button>
        </div>
    </div>
{/if}
