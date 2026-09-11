<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { apiFetch } from "$lib/api";
    import { setLocale } from "$lib/paraglide/runtime";
    import { authStore } from "$lib/stores/auth";
    import { consumeStore } from "$lib/stores/consume";
    import { resyncStore } from "$lib/stores/resync";
    import { themeStore } from "$lib/stores/theme";
    import { toastStore } from "$lib/stores/toast";
    import type { Music, PaginatedResponse } from "$lib/types";

    interface Me {
        id: string;
        email: string;
        role: "admin" | "user";
        theme: string;
        language: string;
    }

    interface AdminUser {
        id: string;
        email: string;
        role: "admin" | "user";
        mustResetPassword: boolean;
        createdAt: string;
    }

    const isAdmin = $derived($authStore.role === "admin");

    let me = $state<Me | null>(null);
    let selectedTheme = $state<"light" | "dark" | "system">("system");
    let selectedLanguage = $state("en");

    let currentPassword = $state("");
    let newPassword = $state("");
    let confirmPassword = $state("");
    let passwordError = $state("");
    let minPasswordLength = $state(0);

    let users = $state<AdminUser[]>([]);
    let showCreateUserModal = $state(false);
    let newUserEmail = $state("");
    let newUserRole = $state<"admin" | "user">("user");
    let credentialModal = $state<{ email: string; password: string } | null>(
        null,
    );

    let confirmDeleteUser = $state<AdminUser | null>(null);
    let confirmResetUser = $state<AdminUser | null>(null);

    let showDeleteSongModal = $state(false);
    let songQuery = $state("");
    let songResults = $state<Music[]>([]);
    let confirmDeleteSong = $state<Music | null>(null);

    async function loadMe() {
        me = await apiFetch<Me>("/auth/me");
        selectedTheme = (me.theme as "light" | "dark" | "system") ?? "system";
        selectedLanguage = me.language;
    }

    async function saveTheme() {
        themeStore.set(selectedTheme);
        await apiFetch("/auth/me", {
            method: "PATCH",
            body: JSON.stringify({ theme: selectedTheme }),
        });
        toastStore.show("Theme updated");
    }

    async function saveLanguage() {
        await apiFetch("/auth/me", {
            method: "PATCH",
            body: JSON.stringify({ language: selectedLanguage }),
        });
        setLocale(selectedLanguage as "en" | "fr");
        toastStore.show("Language updated");
    }

    async function handleChangePassword(e: Event) {
        e.preventDefault();
        passwordError = "";

        if (minPasswordLength > 0 && newPassword.length < minPasswordLength) {
            passwordError = `New password must be at least ${minPasswordLength} characters`;
            return;
        }
        if (newPassword !== confirmPassword) {
            passwordError = "Passwords do not match";
            return;
        }

        try {
            await apiFetch("/auth/change-password", {
                method: "POST",
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            currentPassword = "";
            newPassword = "";
            confirmPassword = "";
            toastStore.show("Password changed");
        } catch (err) {
            passwordError =
                err instanceof Error
                    ? err.message
                    : "Failed to change password";
        }
    }

    async function loadUsers() {
        if (!isAdmin) return;
        const data = await apiFetch<{ results: AdminUser[] }>("/auth/users");
        users = data.results;
    }

    async function handleCreateUser(e: Event) {
        e.preventDefault();
        const result = await apiFetch<{ email: string; password: string }>(
            "/auth/users",
            {
                method: "POST",
                body: JSON.stringify({
                    email: newUserEmail,
                    role: newUserRole,
                }),
            },
        );
        credentialModal = { email: result.email, password: result.password };
        newUserEmail = "";
        newUserRole = "user";
        showCreateUserModal = false;
        await loadUsers();
    }

    async function confirmedResetUser() {
        if (!confirmResetUser) return;
        try {
            const result = await apiFetch<{ password: string }>(
                `/auth/users/${confirmResetUser.id}/reset-password`,
                { method: "POST" },
            );
            credentialModal = {
                email: confirmResetUser.email,
                password: result.password,
            };
            await loadUsers();
        } catch (err) {
            toastStore.show(
                err instanceof Error ? err.message : "Could not reset password",
            );
        }
        confirmResetUser = null;
    }

    async function confirmedDeleteUser() {
        if (!confirmDeleteUser) return;
        try {
            await apiFetch(`/auth/users/${confirmDeleteUser.id}`, {
                method: "DELETE",
            });
            toastStore.show("User deleted");
            await loadUsers();
        } catch (err) {
            toastStore.show(
                err instanceof Error ? err.message : "Could not delete user",
            );
        }
        confirmDeleteUser = null;
    }

    async function searchSongsToDelete() {
        if (!songQuery.trim()) {
            songResults = [];
            return;
        }
        const data = await apiFetch<PaginatedResponse<Music>>(
            `/search?type=music&q=${encodeURIComponent(songQuery)}`,
        );
        songResults = data.results;
    }

    async function handleDeleteSong() {
        if (!confirmDeleteSong) return;
        await apiFetch(`/musics/${confirmDeleteSong.id}`, { method: "DELETE" });
        toastStore.show("Song deleted");
        songResults = songResults.filter((m) => m.id !== confirmDeleteSong!.id);
        confirmDeleteSong = null;
    }

    function handleLogout() {
        authStore.clear();
        goto("/auth");
    }

    onMount(async () => {
        const policy = await apiFetch<{ minLength: number }>(
            "/auth/password-policy",
        );
        minPasswordLength = policy.minLength;
        await loadMe();
        await loadUsers();
    });
</script>

<div class="flex flex-col gap-8">
    <h1 class="text-xl text-[var(--color-text-primary)]">Settings</h1>

    <section class="flex flex-col gap-3" aria-labelledby="preferences-heading">
        <h2
            id="preferences-heading"
            class="text-sm font-medium text-[var(--color-text-primary)]"
        >
            Preferences
        </h2>

        <div
            class="flex flex-wrap gap-4 rounded-xl bg-[var(--color-surface)] p-4 shadow-sm"
        >
            <label
                class="flex flex-col gap-1 text-sm text-[var(--color-text-muted)]"
                for="theme"
            >
                Theme
                <select
                    id="theme"
                    bind:value={selectedTheme}
                    onchange={saveTheme}
                    class="w-fit cursor-pointer rounded-lg border border-gray-300 bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                </select>
            </label>

            <label
                class="flex flex-col gap-1 text-sm text-[var(--color-text-muted)]"
                for="language"
            >
                Language
                <select
                    id="language"
                    bind:value={selectedLanguage}
                    onchange={saveLanguage}
                    class="w-fit cursor-pointer rounded-lg border border-gray-300 bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                >
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                </select>
            </label>
        </div>
    </section>

    <section class="flex flex-col gap-3" aria-labelledby="password-heading">
        <h2
            id="password-heading"
            class="text-sm font-medium text-[var(--color-text-primary)]"
        >
            Change password
        </h2>

        <form
            onsubmit={handleChangePassword}
            aria-describedby={passwordError ? "password-error" : undefined}
            class="flex w-fit flex-col gap-2 rounded-xl bg-[var(--color-surface)] p-4 shadow-sm"
        >
            {#if minPasswordLength > 0}
                <p class="text-sm text-[var(--color-text-muted)]">
                    Password must be at least
                    <span class="font-medium text-[var(--color-text-primary)]">
                        {minPasswordLength} characters
                    </span>.
                </p>
            {/if}

            <label class="sr-only" for="current-password">
                Current password
            </label>
            <input
                id="current-password"
                type="password"
                bind:value={currentPassword}
                placeholder="Current password"
                autocomplete="current-password"
                required
                class="rounded-lg border border-gray-300 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            />

            <label class="sr-only" for="new-password"> New password </label>
            <input
                id="new-password"
                type="password"
                bind:value={newPassword}
                placeholder="New password"
                autocomplete="new-password"
                required
                class="rounded-lg border border-gray-300 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            />

            <label class="sr-only" for="confirm-password">
                Confirm new password
            </label>
            <input
                id="confirm-password"
                type="password"
                bind:value={confirmPassword}
                placeholder="Confirm new password"
                autocomplete="new-password"
                required
                class="rounded-lg border border-gray-300 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            />

            {#if passwordError}
                <span
                    id="password-error"
                    role="alert"
                    class="text-sm text-red-500"
                >
                    {passwordError}
                </span>
            {/if}

            <button
                type="submit"
                class="w-fit cursor-pointer rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            >
                Update password
            </button>
        </form>
    </section>

    {#if isAdmin}
        <section class="flex flex-col gap-3" aria-labelledby="users-heading">
            <div class="flex items-center justify-between">
                <h2
                    id="users-heading"
                    class="text-sm font-medium text-[var(--color-text-primary)]"
                >
                    Users
                </h2>

                <button
                    type="button"
                    onclick={() => (showCreateUserModal = true)}
                    class="w-fit cursor-pointer rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                >
                    New user
                </button>
            </div>

            <div
                class="flex flex-col gap-1 rounded-xl bg-[var(--color-surface)] p-2 shadow-sm"
            >
                {#each users as user}
                    <div class="flex items-center gap-3 rounded-lg px-3 py-2">
                        <div class="flex min-w-0 flex-1 flex-col">
                            <span
                                class="truncate text-sm text-[var(--color-text-primary)]"
                            >
                                {user.email}
                            </span>
                            <span
                                class="text-sm text-[var(--color-text-muted)]"
                            >
                                {user.role}{user.mustResetPassword
                                    ? " · pending reset"
                                    : ""}
                            </span>
                        </div>

                        <button
                            type="button"
                            onclick={() => (confirmResetUser = user)}
                            aria-label={`Reset password for ${user.email}`}
                            class="w-fit shrink-0 cursor-pointer rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-muted)] outline-none transition-colors hover:bg-[var(--color-violet-pale)] hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                        >
                            Reset password
                        </button>

                        <button
                            type="button"
                            onclick={() => (confirmDeleteUser = user)}
                            aria-label={`Delete ${user.email}`}
                            class="w-fit shrink-0 cursor-pointer rounded-lg px-2 py-1.5 text-sm text-red-500 outline-none transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        >
                            Delete
                        </button>
                    </div>
                {/each}
            </div>
        </section>

        <section class="flex flex-col gap-3" aria-labelledby="library-heading">
            <h2
                id="library-heading"
                class="text-sm font-medium text-[var(--color-text-primary)]"
            >
                Library management
            </h2>

            <div
                class="flex w-fit flex-wrap gap-3 rounded-xl bg-[var(--color-surface)] p-4 shadow-sm"
            >
                <button
                    type="button"
                    onclick={() => consumeStore.start()}
                    disabled={$consumeStore.running}
                    class="w-fit cursor-pointer rounded-lg border border-gray-300 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] shadow-sm outline-none transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-violet-pale)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {$consumeStore.running
                        ? "Ingesting..."
                        : "Ingest consume folder"}
                </button>

                <div class="flex flex-col gap-2">
                    <button
                        type="button"
                        onclick={() => resyncStore.start()}
                        disabled={$resyncStore.running}
                        aria-describedby={$resyncStore.running
                            ? "resync-progress"
                            : undefined}
                        class="w-fit cursor-pointer rounded-lg border border-gray-300 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] shadow-sm outline-none transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-violet-pale)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {$resyncStore.running
                            ? "Resyncing..."
                            : "Resync library"}
                    </button>

                    {#if $resyncStore.running}
                        <div
                            id="resync-progress"
                            class="flex w-48 flex-col gap-1"
                            role="status"
                            aria-live="polite"
                        >
                            <div
                                class="h-2 w-full overflow-hidden rounded-full bg-[var(--color-violet-pale)]"
                                role="progressbar"
                                aria-valuemin="0"
                                aria-valuemax={$resyncStore.total}
                                aria-valuenow={$resyncStore.processed}
                                aria-label="Library resync progress"
                            >
                                <div
                                    class="h-full bg-[var(--color-accent)] transition-all"
                                    style="width: {$resyncStore.total > 0
                                        ? ($resyncStore.processed /
                                              $resyncStore.total) *
                                          100
                                        : 0}%"
                                ></div>
                            </div>

                            <span
                                class="text-sm text-[var(--color-text-muted)]"
                            >
                                {$resyncStore.processed} / {$resyncStore.total}
                                songs
                            </span>
                        </div>
                    {/if}
                </div>

                <button
                    type="button"
                    onclick={() => (showDeleteSongModal = true)}
                    class="w-fit cursor-pointer rounded-lg border border-gray-300 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] shadow-sm outline-none transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-violet-pale)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                >
                    Delete songs
                </button>
            </div>
        </section>
    {/if}

    <section class="flex flex-col gap-3">
        <button
            type="button"
            onclick={handleLogout}
            class="w-fit cursor-pointer rounded-lg border border-red-200 px-3 py-2 text-sm text-red-500 outline-none transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        >
            Log out
        </button>
    </section>
</div>

{#if showCreateUserModal}
    <div
        class="fixed inset-0 flex items-center justify-center bg-black/20"
        role="presentation"
    >
        <form
            onsubmit={handleCreateUser}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
            class="flex w-80 flex-col gap-3 rounded-xl bg-[var(--color-surface)] p-6 shadow-lg"
        >
            <h2
                id="create-user-title"
                class="text-lg text-[var(--color-text-primary)]"
            >
                New user
            </h2>

            <label class="sr-only" for="new-user-email"> Email </label>
            <input
                id="new-user-email"
                type="email"
                bind:value={newUserEmail}
                placeholder="Email"
                autocomplete="email"
                required
                class="rounded-lg border border-gray-300 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            />

            <label class="sr-only" for="new-user-role"> User role </label>
            <select
                id="new-user-role"
                bind:value={newUserRole}
                class="cursor-pointer rounded-lg border border-gray-300 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            >
                <option value="user">User</option>
                <option value="admin">Admin</option>
            </select>

            <div class="flex justify-end gap-2">
                <button
                    type="button"
                    onclick={() => (showCreateUserModal = false)}
                    class="cursor-pointer rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] outline-none transition-colors hover:bg-[var(--color-violet-pale)] hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                >
                    Cancel
                </button>

                <button
                    type="submit"
                    class="cursor-pointer rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                >
                    Create
                </button>
            </div>
        </form>
    </div>
{/if}

{#if confirmResetUser}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
        role="presentation"
    >
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-user-title"
            class="flex w-80 flex-col gap-3 rounded-xl bg-[var(--color-surface)] p-6 shadow-lg"
        >
            <h2
                id="reset-user-title"
                class="text-lg text-[var(--color-text-primary)]"
            >
                Reset password for {confirmResetUser.email}?
            </h2>

            <p class="text-sm text-[var(--color-text-muted)]">
                A new temporary password will be generated.
            </p>

            <div class="flex justify-end gap-2">
                <button
                    type="button"
                    onclick={() => (confirmResetUser = null)}
                    class="cursor-pointer rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] outline-none transition-colors hover:bg-[var(--color-violet-pale)] hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    onclick={confirmedResetUser}
                    class="cursor-pointer rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                >
                    Reset
                </button>
            </div>
        </div>
    </div>
{/if}

{#if confirmDeleteUser}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
        role="presentation"
    >
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            class="flex w-80 flex-col gap-3 rounded-xl bg-[var(--color-surface)] p-6 shadow-lg"
        >
            <h2
                id="delete-user-title"
                class="text-lg text-[var(--color-text-primary)]"
            >
                Delete {confirmDeleteUser.email}?
            </h2>

            <p class="text-sm text-[var(--color-text-muted)]">
                This permanently removes the account.
            </p>

            <div class="flex justify-end gap-2">
                <button
                    type="button"
                    onclick={() => (confirmDeleteUser = null)}
                    class="cursor-pointer rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] outline-none transition-colors hover:bg-[var(--color-violet-pale)] hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    onclick={confirmedDeleteUser}
                    class="cursor-pointer rounded-lg bg-red-500 px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                >
                    Delete
                </button>
            </div>
        </div>
    </div>
{/if}

{#if credentialModal}
    <div
        class="fixed inset-0 flex items-center justify-center bg-black/20"
        role="presentation"
    >
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="credentials-title"
            class="flex w-80 flex-col gap-3 rounded-xl bg-[var(--color-surface)] p-6 shadow-lg"
        >
            <h2
                id="credentials-title"
                class="text-lg text-[var(--color-text-primary)]"
            >
                Account credentials
            </h2>

            <p class="text-sm text-[var(--color-text-muted)]">
                Share these with the user securely.
            </p>

            <div
                class="flex flex-col gap-1 rounded-lg border border-gray-300 p-3 text-sm text-[var(--color-text-primary)]"
            >
                <span class="break-all">
                    <strong>Email:</strong>
                    {credentialModal.email}
                </span>
                <span class="break-all">
                    <strong>Password:</strong>
                    {credentialModal.password}
                </span>
            </div>

            <button
                type="button"
                onclick={() => (credentialModal = null)}
                class="cursor-pointer rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            >
                Done
            </button>
        </div>
    </div>
{/if}

{#if showDeleteSongModal}
    <div
        class="fixed inset-0 flex items-center justify-center bg-black/20"
        role="presentation"
    >
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-songs-title"
            class="flex h-96 w-96 flex-col gap-3 rounded-xl bg-[var(--color-surface)] p-6 shadow-lg"
        >
            <div class="flex items-center justify-between">
                <h2
                    id="delete-songs-title"
                    class="text-lg text-[var(--color-text-primary)]"
                >
                    Delete songs
                </h2>

                <button
                    type="button"
                    onclick={() => (showDeleteSongModal = false)}
                    class="cursor-pointer rounded-lg px-2 py-1 text-sm text-[var(--color-text-muted)] outline-none transition-colors hover:bg-[var(--color-violet-pale)] hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                >
                    Close
                </button>
            </div>

            <label class="sr-only" for="song-search"> Search songs </label>
            <input
                id="song-search"
                bind:value={songQuery}
                oninput={searchSongsToDelete}
                placeholder="Search songs"
                type="search"
                class="cursor-text rounded-lg border border-gray-300 bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] outline-none placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            />

            <div class="flex flex-1 flex-col gap-1 overflow-y-auto">
                {#each songResults as song}
                    <div
                        class="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--color-violet-pale)]"
                    >
                        <div class="flex flex-1 flex-col">
                            <span
                                class="text-sm text-[var(--color-text-primary)]"
                            >
                                {song.title}
                            </span>
                            <span
                                class="text-sm text-[var(--color-text-muted)]"
                            >
                                {song.artist.name}
                            </span>
                        </div>

                        <button
                            type="button"
                            onclick={() => (confirmDeleteSong = song)}
                            aria-label={`Delete ${song.title}`}
                            class="w-fit cursor-pointer rounded-lg px-2 py-1.5 text-sm text-red-500 outline-none transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        >
                            Delete
                        </button>
                    </div>
                {/each}
            </div>
        </div>
    </div>
{/if}

{#if confirmDeleteSong}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
        role="presentation"
    >
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-song-title"
            class="flex w-80 flex-col gap-3 rounded-xl bg-[var(--color-surface)] p-6 shadow-lg"
        >
            <h2
                id="delete-song-title"
                class="text-lg text-[var(--color-text-primary)]"
            >
                Delete "{confirmDeleteSong.title}"?
            </h2>

            <p class="text-sm text-[var(--color-text-muted)]">
                This permanently removes the file and its data.
            </p>

            <div class="flex justify-end gap-2">
                <button
                    type="button"
                    onclick={() => (confirmDeleteSong = null)}
                    class="cursor-pointer rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] outline-none transition-colors hover:bg-[var(--color-violet-pale)] hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                >
                    Cancel
                </button>

                <button
                    type="button"
                    onclick={handleDeleteSong}
                    class="cursor-pointer rounded-lg bg-red-500 px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                >
                    Delete
                </button>
            </div>
        </div>
    </div>
{/if}
