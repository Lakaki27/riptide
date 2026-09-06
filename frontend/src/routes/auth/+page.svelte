<script lang="ts">
    import { goto } from "$app/navigation";
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
            error =
                err instanceof Error
                    ? err.message
                    : "Invalid email or password";
        } finally {
            loading = false;
        }
    }

    async function handleResetSubmit(e: Event) {
        e.preventDefault();
        resetError = "";

        if (newPassword.length < 8) {
            resetError = "Password must be at least 8 characters";
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
            resetError =
                err instanceof Error ? err.message : "Failed to reset password";
        } finally {
            resetLoading = false;
        }
    }
</script>

<div class="flex h-screen items-center justify-center bg-[var(--color-bg)]">
    {#if resetToken}
        <form
            onsubmit={handleResetSubmit}
            class="flex w-80 flex-col gap-3 rounded-xl bg-[var(--color-surface)] p-6 shadow-sm"
        >
            <h1 class="mb-1 text-xl text-[var(--color-text-primary)]">
                Set a new password
            </h1>
            <p class="mb-2 text-sm text-[var(--color-text-muted)]">
                Your password was reset by an administrator. Choose a new one to
                continue.
            </p>

            <input
                type="password"
                bind:value={newPassword}
                placeholder="New password"
                required
                class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />
            <input
                type="password"
                bind:value={confirmPassword}
                placeholder="Confirm new password"
                required
                class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />

            {#if resetError}
                <span class="text-sm text-red-500">{resetError}</span>
            {/if}

            <button
                type="submit"
                disabled={resetLoading}
                class="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
                {resetLoading ? "Saving..." : "Set password"}
            </button>
        </form>
    {:else}
        <form
            onsubmit={handleSubmit}
            class="flex w-80 flex-col items-center gap-3 rounded-xl bg-[var(--color-surface)] p-6 shadow-sm"
        >
            <img
                src="/logo.png"
                alt="Riptide"
                class="mb-2 h-16 w-16 rounded-2xl"
            />
            <h1 class="mb-2 text-xl text-[var(--color-text-primary)]">
                Sign in
            </h1>

            <input
                type="email"
                bind:value={email}
                placeholder="Email"
                required
                class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />
            <input
                type="password"
                bind:value={password}
                placeholder="Password"
                required
                class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />

            {#if error}
                <span class="text-sm text-red-500">{error}</span>
            {/if}

            <button
                type="submit"
                disabled={loading}
                class="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
                {loading ? "Signing in..." : "Sign in"}
            </button>

            <button
                type="button"
                onclick={() => (showForgotModal = true)}
                class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            >
                Forgot password?
            </button>
        </form>
    {/if}
</div>

{#if showForgotModal}
    <div class="fixed inset-0 flex items-center justify-center bg-black/20">
        <div
            class="flex w-80 flex-col gap-3 rounded-xl bg-[var(--color-surface)] p-6"
        >
            <h2 class="text-lg text-[var(--color-text-primary)]">
                Forgot password
            </h2>
            <p class="text-sm text-[var(--color-text-muted)]">
                Please contact your administrator to have your password reset.
            </p>
            <button
                onclick={() => (showForgotModal = false)}
                class="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white hover:bg-[var(--color-accent-hover)]"
            >
                Got it
            </button>
        </div>
    </div>
{/if}
