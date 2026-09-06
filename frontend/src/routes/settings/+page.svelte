<script lang="ts">
    import { onMount } from "svelte";
    import { apiFetch } from "$lib/api";
    import { authStore } from "$lib/stores/auth";
    import { toastStore } from "$lib/stores/toast";
    import type { Music, PaginatedResponse } from "$lib/types";
    import { themeStore } from "$lib/stores/themes";
    import { resyncStore } from "$lib/stores/resync";
    import { goto } from "$app/navigation";

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

    const isAdmin = $derived(
        $authStore.role === "admin" || $authStore.authEnabled === false,
    );

    let me = $state<Me | null>(null);
    let selectedTheme = $state<"light" | "dark" | "system">("system");
    let selectedLanguage = $state("en");

    let currentPassword = $state("");
    let newPassword = $state("");
    let confirmPassword = $state("");
    let passwordError = $state("");

    let users = $state<AdminUser[]>([]);
    let showCreateUserModal = $state(false);
    let newUserEmail = $state("");
    let newUserRole = $state<"admin" | "user">("user");
    let credentialModal = $state<{ email: string; password: string } | null>(
        null,
    );

    let showDeleteSongModal = $state(false);
    let songQuery = $state("");
    let songResults = $state<Music[]>([]);
    let confirmDeleteSong = $state<Music | null>(null);

    async function loadMe() {
        if ($authStore.authEnabled === false) {
            selectedTheme =
                ($themeStore as unknown as "light" | "dark" | "system") ??
                "system";
            return;
        }
        me = await apiFetch<Me>("/auth/me");
        selectedTheme = (me.theme as "light" | "dark" | "system") ?? "system";
        selectedLanguage = me.language;
    }

    async function saveTheme() {
        themeStore.set(selectedTheme);
        if ($authStore.authEnabled) {
            await apiFetch("/auth/me", {
                method: "PATCH",
                body: JSON.stringify({ theme: selectedTheme }),
            });
        }
        toastStore.show("Theme updated");
    }

    async function saveLanguage() {
        if ($authStore.authEnabled) {
            await apiFetch("/auth/me", {
                method: "PATCH",
                body: JSON.stringify({ language: selectedLanguage }),
            });
        }
        toastStore.show("Language updated");
    }

    async function handleChangePassword(e: Event) {
        e.preventDefault();
        passwordError = "";

        if (newPassword.length < 8) {
            passwordError = "New password must be at least 8 characters";
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

    async function handleResetUserPassword(user: AdminUser) {
        const result = await apiFetch<{ password: string }>(
            `/auth/users/${user.id}/reset-password`,
            {
                method: "POST",
            },
        );
        credentialModal = { email: user.email, password: result.password };
        await loadUsers();
    }

    async function handleDeleteUser(user: AdminUser) {
        await apiFetch(`/auth/users/${user.id}`, { method: "DELETE" });
        toastStore.show("User deleted");
        await loadUsers();
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

    onMount(async () => {
        await loadMe();
        await loadUsers();
    });
</script>

<div class="flex flex-col gap-8">
    <h1 class="text-xl text-[var(--color-text-primary)]">Settings</h1>

    <section class="flex flex-col gap-3">
        <h2 class="text-sm font-medium text-[var(--color-text-primary)]">
            Preferences
        </h2>
        <div
            class="flex flex-wrap gap-4 rounded-xl bg-[var(--color-surface)] p-4 shadow-sm"
        >
            <label
                class="flex flex-col gap-1 text-sm text-[var(--color-text-muted)]"
            >
                Theme
                <select
                    bind:value={selectedTheme}
                    onchange={saveTheme}
                    class="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-primary)]"
                >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                </select>
            </label>

            <label
                class="flex flex-col gap-1 text-sm text-[var(--color-text-muted)]"
            >
                Language
                <select
                    bind:value={selectedLanguage}
                    onchange={saveLanguage}
                    class="rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-primary)]"
                >
                    <option value="en">English</option>
                    <option value="fr">Français</option>
                </select>
            </label>
        </div>
    </section>

    <section class="flex flex-col gap-3">
        <h2 class="text-sm font-medium text-[var(--color-text-primary)]">
            Change password
        </h2>
        <form
            onsubmit={handleChangePassword}
            class="flex flex-col gap-2 rounded-xl bg-[var(--color-surface)] p-4 shadow-sm"
        >
            <input
                type="password"
                bind:value={currentPassword}
                placeholder="Current password"
                required
                class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />
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
            {#if passwordError}
                <span class="text-sm text-red-500">{passwordError}</span>
            {/if}
            <button
                type="submit"
                class="w-fit rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white hover:bg-[var(--color-accent-hover)]"
            >
                Update password
            </button>
        </form>
    </section>

    <section class="flex flex-col gap-3">
        <button
            onclick={() => {
                authStore.clear();
                goto("/auth");
            }}
            class="w-fit rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
        >
            Log out
        </button>
    </section>

    {#if isAdmin}
        <section class="flex flex-col gap-3">
            <div class="flex items-center justify-between">
                <h2
                    class="text-sm font-medium text-[var(--color-text-primary)]"
                >
                    Users
                </h2>
                <button
                    onclick={() => (showCreateUserModal = true)}
                    class="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white hover:bg-[var(--color-accent-hover)]"
                >
                    New user
                </button>
            </div>
            <div
                class="flex flex-col gap-1 rounded-xl bg-[var(--color-surface)] p-2 shadow-sm"
            >
                {#each users as user}
                    <div class="flex items-center gap-3 rounded-lg px-3 py-2">
                        <div class="flex flex-1 flex-col">
                            <span
                                class="text-sm text-[var(--color-text-primary)]"
                                >{user.email}</span
                            >
                            <span
                                class="text-sm text-[var(--color-text-muted)]"
                            >
                                {user.role}{user.mustResetPassword
                                    ? " · pending reset"
                                    : ""}
                            </span>
                        </div>
                        <button
                            onclick={() => handleResetUserPassword(user)}
                            class="rounded-lg px-2 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                        >
                            Reset password
                        </button>
                        <button
                            onclick={() => handleDeleteUser(user)}
                            class="rounded-lg px-2 py-1.5 text-sm text-red-500 hover:bg-red-50"
                        >
                            Delete
                        </button>
                    </div>
                {/each}
            </div>
        </section>

        <section class="flex flex-col gap-3">
            <h2 class="text-sm font-medium text-[var(--color-text-primary)]">
                Library management
            </h2>
            <div class="rounded-xl bg-[var(--color-surface)] p-4 shadow-sm">
                <button
                    onclick={() => (showDeleteSongModal = true)}
                    class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
                >
                    Delete songs
                </button>
            </div>

            <div class="rounded-xl bg-[var(--color-surface)] p-4 shadow-sm">
                <button
                    onclick={() => resyncStore.start()}
                    disabled={$resyncStore.running}
                    class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] disabled:opacity-50"
                >
                    {$resyncStore.running ? "Resyncing..." : "Resync library"}
                </button>

                {#if $resyncStore.running}
                    <div class="mt-2 flex flex-col gap-1">
                        <div
                            class="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]"
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
                        <span class="text-sm text-[var(--color-text-muted)]">
                            {$resyncStore.processed} / {$resyncStore.total} songs
                        </span>
                    </div>
                {/if}
            </div>
        </section>
    {/if}
</div>

{#if showCreateUserModal}
    <div class="fixed inset-0 flex items-center justify-center bg-black/20">
        <form
            onsubmit={handleCreateUser}
            class="flex w-80 flex-col gap-3 rounded-xl bg-[var(--color-surface)] p-6"
        >
            <h2 class="text-lg text-[var(--color-text-primary)]">New user</h2>
            <input
                type="email"
                bind:value={newUserEmail}
                placeholder="Email"
                required
                class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />
            <select
                bind:value={newUserRole}
                class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            >
                <option value="user">User</option>
                <option value="admin">Admin</option>
            </select>
            <div class="flex justify-end gap-2">
                <button
                    type="button"
                    onclick={() => (showCreateUserModal = false)}
                    class="rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    class="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white hover:bg-[var(--color-accent-hover)]"
                >
                    Create
                </button>
            </div>
        </form>
    </div>
{/if}

{#if credentialModal}
    <div class="fixed inset-0 flex items-center justify-center bg-black/20">
        <div
            class="flex w-80 flex-col gap-3 rounded-xl bg-[var(--color-surface)] p-6"
        >
            <h2 class="text-lg text-[var(--color-text-primary)]">
                Account credentials
            </h2>
            <p class="text-sm text-[var(--color-text-muted)]">
                Share these with the user securely.
            </p>
            <div
                class="flex flex-col gap-1 rounded-lg border border-[var(--color-border)] p-3 text-sm"
            >
                <span><strong>Email:</strong> {credentialModal.email}</span>
                <span
                    ><strong>Password:</strong> {credentialModal.password}</span
                >
            </div>
            <button
                onclick={() => (credentialModal = null)}
                class="rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm text-white hover:bg-[var(--color-accent-hover)]"
            >
                Done
            </button>
        </div>
    </div>
{/if}

{#if showDeleteSongModal}
    <div class="fixed inset-0 flex items-center justify-center bg-black/20">
        <div
            class="flex h-96 w-96 flex-col gap-3 rounded-xl bg-[var(--color-surface)] p-6"
        >
            <div class="flex items-center justify-between">
                <h2 class="text-lg text-[var(--color-text-primary)]">
                    Delete songs
                </h2>
                <button
                    onclick={() => (showDeleteSongModal = false)}
                    class="text-[var(--color-text-muted)]">Close</button
                >
            </div>
            <input
                bind:value={songQuery}
                oninput={searchSongsToDelete}
                placeholder="Search songs"
                class="rounded-lg border border-[var(--color-border)] px-3 py-2 text-sm"
            />
            <div class="flex flex-1 flex-col gap-1 overflow-y-auto">
                {#each songResults as song}
                    <div
                        class="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--color-surface-hover)]"
                    >
                        <div class="flex flex-1 flex-col">
                            <span
                                class="text-sm text-[var(--color-text-primary)]"
                                >{song.title}</span
                            >
                            <span class="text-sm text-[var(--color-text-muted)]"
                                >{song.artist.name}</span
                            >
                        </div>
                        <button
                            onclick={() => (confirmDeleteSong = song)}
                            class="rounded-lg px-2 py-1.5 text-sm text-red-500 hover:bg-red-50"
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
    >
        <div
            class="flex w-80 flex-col gap-3 rounded-xl bg-[var(--color-surface)] p-6"
        >
            <h2 class="text-lg text-[var(--color-text-primary)]">
                Delete "{confirmDeleteSong.title}"?
            </h2>
            <p class="text-sm text-[var(--color-text-muted)]">
                This permanently removes the file and its data.
            </p>
            <div class="flex justify-end gap-2">
                <button
                    onclick={() => (confirmDeleteSong = null)}
                    class="rounded-lg px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]"
                >
                    Cancel
                </button>
                <button
                    onclick={handleDeleteSong}
                    class="rounded-lg bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-600"
                >
                    Delete
                </button>
            </div>
        </div>
    </div>
{/if}
