<script lang="ts">
import { onMount } from "svelte";
import { goto } from "$app/navigation";
import { apiFetch } from "$lib/api";
import { m } from "$lib/paraglide/messages";
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
let credentialModal = $state<{ email: string; password: string } | null>(null);

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
    toastStore.show(m["theme_updated"]());
}

async function saveLanguage() {
    await apiFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ language: selectedLanguage }),
    });
    setLocale(selectedLanguage as "en" | "fr");
    toastStore.show(m["language_updated"]());
}

async function handleChangePassword(e: Event) {
    e.preventDefault();
    passwordError = "";

    if (minPasswordLength > 0 && newPassword.length < minPasswordLength) {
        passwordError = m["password_length_requirement"]({
            length: minPasswordLength,
        });
        return;
    }
    if (newPassword !== confirmPassword) {
        passwordError = m["passwords_do_not_match"]();
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
        toastStore.show(m["password_changed"]());
    } catch (err) {
        passwordError = err instanceof Error ? err.message : m["password_changed_fail"]();
    }
}

async function loadUsers() {
    if (!isAdmin) return;
    const data = await apiFetch<{ results: AdminUser[] }>("/auth/users");
    users = data.results;
}

async function handleCreateUser(e: Event) {
    e.preventDefault();
    const result = await apiFetch<{ email: string; password: string }>("/auth/users", {
        method: "POST",
        body: JSON.stringify({
            email: newUserEmail,
            role: newUserRole,
        }),
    });
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
        toastStore.show(err instanceof Error ? err.message : m["couldnt_reset_password"]());
    }
    confirmResetUser = null;
}

async function confirmedDeleteUser() {
    if (!confirmDeleteUser) return;
    try {
        await apiFetch(`/auth/users/${confirmDeleteUser.id}`, {
            method: "DELETE",
        });
        toastStore.show(m["user_deleted"]());
        await loadUsers();
    } catch (err) {
        toastStore.show(err instanceof Error ? err.message : m["user_deleted_fail"]());
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
    toastStore.show(m["song_deleted"]());
    songResults = songResults.filter((m) => m.id !== confirmDeleteSong!.id);
    confirmDeleteSong = null;
}

function handleLogout() {
    authStore.clear();
    goto("/auth");
}

onMount(async () => {
    const policy = await apiFetch<{ minLength: number }>("/auth/password-policy");
    minPasswordLength = policy.minLength;
    await loadMe();
    await loadUsers();
});
</script>

<div class="flex flex-col gap-8">
    <h1 class="text-xl text-(--color-text-primary)">{m["nav.settings"]()}</h1>

    <section class="flex flex-col gap-3" aria-labelledby="preferences-heading">
        <h2
            id="preferences-heading"
            class="text-sm font-medium text-(--color-text-primary)"
        >
            {m["preferences"]()}
        </h2>

        <div
            class="flex flex-wrap gap-4 rounded-xl bg-(--color-surface) p-4 shadow-sm"
        >
            <label
                class="flex flex-col gap-1 text-sm text-(--color-text-muted)"
                for="theme"
            >
                {m["theme"]()}
                <select
                    id="theme"
                    bind:value={selectedTheme}
                    onchange={saveTheme}
                    class="w-fit cursor-pointer rounded-lg border border-gray-300 bg-(--color-surface) px-3 py-1.5 text-sm text-(--color-text-primary) outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                >
                    <option value="system">{m["themes.system"]()}</option>
                    <option value="light">{m["themes.light"]()}</option>
                    <option value="dark">{m["themes.dark"]()}</option>
                </select>
            </label>

            <label
                class="flex flex-col gap-1 text-sm text-(--color-text-muted)"
                for="language"
            >
                {m["language"]()}
                <select
                    id="language"
                    bind:value={selectedLanguage}
                    onchange={saveLanguage}
                    class="w-fit cursor-pointer rounded-lg border border-gray-300 bg-(--color-surface) px-3 py-1.5 text-sm text-(--color-text-primary) outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                >
                    <option value="en">{m["languages.en"]()}</option>
                    <option value="fr">{m["languages.fr"]()}</option>
                </select>
            </label>
        </div>
    </section>

    <section class="flex flex-col gap-3" aria-labelledby="password-heading">
        <h2
            id="password-heading"
            class="text-sm font-medium text-(--color-text-primary)"
        >
            {m["change_password"]()}
        </h2>

        <form
            onsubmit={handleChangePassword}
            aria-describedby={passwordError ? "password-error" : undefined}
            class="flex w-fit flex-col gap-2 rounded-xl bg-(--color-surface) p-4 shadow-sm"
        >
            {#if minPasswordLength > 0}
                <p class="text-sm text-(--color-text-muted)">
                    {m["change_password_1"]()}
                    <span class="font-medium text-(--color-text-primary)">
                        {m["change_password_2"]({ length: minPasswordLength })}
                    </span>.
                </p>
            {/if}

            <label class="sr-only" for="current-password">
                {m["current_password"]()}
            </label>
            <input
                id="current-password"
                type="password"
                bind:value={currentPassword}
                placeholder={m["current_password"]()}
                autocomplete="current-password"
                required
                class="rounded-lg border border-gray-300 bg-(--color-surface) px-3 py-2 text-sm text-(--color-text-primary) outline-none placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            />

            <label class="sr-only" for="new-password"
                >{m["new_password"]()}</label
            >
            <input
                id="new-password"
                type="password"
                bind:value={newPassword}
                placeholder={m["new_password"]()}
                autocomplete="new-password"
                required
                class="rounded-lg border border-gray-300 bg-(--color-surface) px-3 py-2 text-sm text-(--color-text-primary) outline-none placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            />

            <label class="sr-only" for="confirm-password">
                {m["new_password_confirm"]()}
            </label>
            <input
                id="confirm-password"
                type="password"
                bind:value={confirmPassword}
                placeholder={m["new_password_confirm"]()}
                autocomplete="new-password"
                required
                class="rounded-lg border border-gray-300 bg-(--color-surface) px-3 py-2 text-sm text-(--color-text-primary) outline-none placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
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
                class="w-fit cursor-pointer rounded-lg bg-(--color-accent) px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-(--color-accent-hover) focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            >
                {m["update_password"]()}
            </button>
        </form>
    </section>

    {#if isAdmin}
        <section class="flex flex-col gap-3" aria-labelledby="users-heading">
            <div class="flex items-center justify-between">
                <h2
                    id="users-heading"
                    class="text-sm font-medium text-(--color-text-primary)"
                >
                    {m["users"]()}
                </h2>

                <button
                    type="button"
                    onclick={() => (showCreateUserModal = true)}
                    class="w-fit cursor-pointer rounded-lg bg-(--color-accent) px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-[var(--color-accent-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                >
                    {m["new_user"]()}
                </button>
            </div>

            <div
                class="flex flex-col gap-1 rounded-xl bg-(--color-surface) p-2 shadow-sm"
            >
                {#each users as user}
                    <div class="flex items-center gap-3 rounded-lg px-3 py-2">
                        <div class="flex min-w-0 flex-1 flex-col">
                            <span
                                class="truncate text-sm text-(--color-text-primary)"
                            >
                                {user.email}
                            </span>
                            <span class="text-sm text-(--color-text-muted)">
                                {user.role}{user.mustResetPassword
                                    ? ` · ${m["pending_reset"]()}`
                                    : ""}
                            </span>
                        </div>

                        <button
                            type="button"
                            onclick={() => (confirmResetUser = user)}
                            aria-label={m["reset_password_for"]({
                                email: user.email,
                            })}
                            class="w-fit shrink-0 cursor-pointer rounded-lg px-2 py-1.5 text-sm text-(--color-text-muted) outline-none transition-colors hover:bg-[var(--color-violet-pale)] hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                        >
                            {m["reset_password"]()}
                        </button>

                        <button
                            type="button"
                            onclick={() => (confirmDeleteUser = user)}
                            aria-label={`Delete ${user.email}`}
                            class="w-fit shrink-0 cursor-pointer rounded-lg px-2 py-1.5 text-sm text-red-500 outline-none transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        >
                            {m["delete"]()}
                        </button>
                    </div>
                {/each}
            </div>
        </section>

        <section class="flex flex-col gap-3" aria-labelledby="library-heading">
            <h2
                id="library-heading"
                class="text-sm font-medium text-(--color-text-primary)"
            >
                {m["library_management"]()}
            </h2>

            <div
                class="flex w-fit flex-wrap gap-3 rounded-xl bg-(--color-surface) p-4 shadow-sm"
            >
                <button
                    type="button"
                    onclick={() => consumeStore.start()}
                    disabled={$consumeStore.running}
                    class="w-fit cursor-pointer rounded-lg border border-gray-300 bg-(--color-surface) px-3 py-2 text-sm text-(--color-text-primary) shadow-sm outline-none transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-violet-pale)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {$consumeStore.running
                        ? m["ingesting"]()
                        : m["ingest_consume_folder"]()}
                </button>

                <div class="flex flex-col gap-2">
                    <button
                        type="button"
                        onclick={() => resyncStore.start()}
                        disabled={$resyncStore.running}
                        aria-describedby={$resyncStore.running
                            ? "resync-progress"
                            : undefined}
                        class="w-fit cursor-pointer rounded-lg border border-gray-300 bg-(--color-surface) px-3 py-2 text-sm text-(--color-text-primary) shadow-sm outline-none transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-violet-pale)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {$resyncStore.running
                            ? m["resyncing"]()
                            : m["resync_library"]()}
                    </button>

                    {#if $resyncStore.running}
                        <div
                            id="resync-progress"
                            class="flex w-48 flex-col gap-1"
                            role="status"
                            aria-live="polite"
                        >
                            <div
                                class="h-2 w-full overflow-hidden rounded-full bg-(--color-violet-pale)"
                                role="progressbar"
                                aria-valuemin="0"
                                aria-valuemax={$resyncStore.total}
                                aria-valuenow={$resyncStore.processed}
                                aria-label={m["library_resync_progress"]()}
                            >
                                <div
                                    class="h-full bg-(--color-accent) transition-all"
                                    style="width: {$resyncStore.total > 0
                                        ? ($resyncStore.processed /
                                              $resyncStore.total) *
                                          100
                                        : 0}%"
                                ></div>
                            </div>

                            <span class="text-sm text-(--color-text-muted)">
                                {m["song_progress_count"]({
                                    current: $resyncStore.processed,
                                    total: $resyncStore.total,
                                })}
                            </span>
                        </div>
                    {/if}
                </div>

                <button
                    type="button"
                    onclick={() => (showDeleteSongModal = true)}
                    class="w-fit cursor-pointer rounded-lg border border-gray-300 bg-(--color-surface) px-3 py-2 text-sm text-(--color-text-primary) shadow-sm outline-none transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-violet-pale)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
                >
                    {m["delete_songs"]()}
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
            {m["logout"]()}
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
            class="flex w-80 flex-col gap-3 rounded-xl bg-(--color-surface) p-6 shadow-lg"
        >
            <h2
                id="create-user-title"
                class="text-lg text-(--color-text-primary)"
            >
                {m["new_user"]()}
            </h2>

            <label class="sr-only" for="new-user-email"> Email </label>
            <input
                id="new-user-email"
                type="email"
                bind:value={newUserEmail}
                placeholder={m["email"]()}
                autocomplete="email"
                required
                class="rounded-lg border border-gray-300 bg-(--color-surface) px-3 py-2 text-sm text-(--color-text-primary) outline-none placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            />

            <label class="sr-only" for="new-user-role">{m["user_role"]()}</label
            >
            <select
                id="new-user-role"
                bind:value={newUserRole}
                class="cursor-pointer rounded-lg border border-gray-300 bg-(--color-surface) px-3 py-2 text-sm text-(--color-text-primary) outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2"
            >
                <option value="user">{m["user_roles.user"]()}</option>
                <option value="admin">{m["user_roles.admin"]()}</option>
            </select>

            <div class="flex justify-end gap-2">
                <button
                    type="button"
                    onclick={() => (showCreateUserModal = false)}
                    class="cursor-pointer rounded-lg px-3 py-2 text-sm text-(--color-text-muted) outline-none transition-colors hover:bg-(--color-violet-pale) hover:text-(--color-text-primary) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2"
                >
                    {m["cancel"]()}
                </button>

                <button
                    type="submit"
                    class="cursor-pointer rounded-lg bg-(--color-accent) px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-(--color-accent-hover) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2"
                >
                    {m["create"]()}
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
            class="flex w-80 flex-col gap-3 rounded-xl bg-(--color-surface) p-6 shadow-lg"
        >
            <h2
                id="reset-user-title"
                class="text-lg text-(--color-text-primary)"
            >
                {m["reset_password_for_q"]({ email: confirmResetUser.email })}
            </h2>

            <p class="text-sm text-(--color-text-muted)">
                {m["reset_password_for_q_text"]()}
            </p>

            <div class="flex justify-end gap-2">
                <button
                    type="button"
                    onclick={() => (confirmResetUser = null)}
                    class="cursor-pointer rounded-lg px-3 py-2 text-sm text-(--color-text-muted) outline-none transition-colors hover:bg-(--color-violet-pale) hover:text-(--color-text-primary) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2"
                >
                    {m["cancel"]()}</button
                >

                <button
                    type="button"
                    onclick={confirmedResetUser}
                    class="cursor-pointer rounded-lg bg-(--color-accent) px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-(--color-accent-hover) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2"
                >
                    {m["reset"]()}
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
            class="flex w-80 flex-col gap-3 rounded-xl bg-(--color-surface) p-6 shadow-lg"
        >
            <h2
                id="delete-user-title"
                class="text-lg text-(--color-text-primary)"
            >
                {m["delete_email_q"]({ email: confirmDeleteUser.email })}
            </h2>

            <p class="text-sm text-(--color-text-muted)">
                {m["delete_email_q_text"]()}
            </p>

            <div class="flex justify-end gap-2">
                <button
                    type="button"
                    onclick={() => (confirmDeleteUser = null)}
                    class="cursor-pointer rounded-lg px-3 py-2 text-sm text-(--color-text-muted) outline-none transition-colors hover:bg-(--color-violet-pale) hover:text-(--color-text-primary) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2"
                >
                    {m["cancel"]()}
                </button>

                <button
                    type="button"
                    onclick={confirmedDeleteUser}
                    class="cursor-pointer rounded-lg bg-red-500 px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                >
                    {m["delete"]()}
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
            class="flex w-80 flex-col gap-3 rounded-xl bg-(--color-surface) p-6 shadow-lg"
        >
            <h2
                id="credentials-title"
                class="text-lg text-(--color-text-primary)"
            >
                {m["account_credentials"]()}
            </h2>

            <p class="text-sm text-(--color-text-muted)">
                {m["account_credentials_text"]()}
            </p>

            <div
                class="flex flex-col gap-1 rounded-lg border border-gray-300 p-3 text-sm text-(--color-text-primary)"
            >
                <span class="break-all">
                    <strong>{m["email"]()}:</strong>
                    {credentialModal.email}
                </span>
                <span class="break-all">
                    <strong>{m["password"]()}:</strong>
                    {credentialModal.password}
                </span>
            </div>

            <button
                type="button"
                onclick={() => (credentialModal = null)}
                class="cursor-pointer rounded-lg bg-(--color-accent) px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-(--color-accent-hover) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2"
            >
                {m["done"]()}
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
            class="flex h-96 w-96 flex-col gap-3 rounded-xl bg-(--color-surface) p-6 shadow-lg"
        >
            <div class="flex items-center justify-between">
                <h2
                    id="delete-songs-title"
                    class="text-lg text-(--color-text-primary)"
                >
                    {m["delete_songs"]()}
                </h2>

                <button
                    type="button"
                    onclick={() => (showDeleteSongModal = false)}
                    class="cursor-pointer rounded-lg px-2 py-1 text-sm text-(--color-text-muted) outline-none transition-colors hover:bg-(--color-violet-pale) hover:text-(--color-text-primary) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2"
                >
                    {m["close"]()}
                </button>
            </div>

            <label class="sr-only" for="song-search"
                >{m["search_songs"]()}</label
            >
            <input
                id="song-search"
                bind:value={songQuery}
                oninput={searchSongsToDelete}
                placeholder={m["search_songs"]()}
                type="search"
                class="cursor-text rounded-lg border border-gray-300 bg-(--color-surface) px-3 py-2 text-sm text-(--color-text-primary) outline-none placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2"
            />

            <div class="flex flex-1 flex-col gap-1 overflow-y-auto">
                {#each songResults as song}
                    <div
                        class="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-(--color-violet-pale)"
                    >
                        <div class="flex flex-1 flex-col">
                            <span class="text-sm text-(--color-text-primary)">
                                {song.title}
                            </span>
                            <span class="text-sm text-(--color-text-muted)">
                                {song.artist.name}
                            </span>
                        </div>

                        <button
                            type="button"
                            onclick={() => (confirmDeleteSong = song)}
                            aria-label={`Delete ${song.title}`}
                            class="w-fit cursor-pointer rounded-lg px-2 py-1.5 text-sm text-red-500 outline-none transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        >
                            {m["delete"]()}
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
            class="flex w-80 flex-col gap-3 rounded-xl bg-(--color-surface) p-6 shadow-lg"
        >
            <h2
                id="delete-song-title"
                class="text-lg text-(--color-text-primary)"
            >
                {m["delete_song_q"]({ title: confirmDeleteSong.title })}
            </h2>

            <p class="text-sm text-(--color-text-muted)">
                {m["delete_song_q_text"]()}
            </p>

            <div class="flex justify-end gap-2">
                <button
                    type="button"
                    onclick={() => (confirmDeleteSong = null)}
                    class="cursor-pointer rounded-lg px-3 py-2 text-sm text-(--color-text-muted) outline-none transition-colors hover:bg-(--color-violet-pale) hover:text-(--color-text-primary) focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-2"
                >
                    {m["cancel"]()}
                </button>

                <button
                    type="button"
                    onclick={handleDeleteSong}
                    class="cursor-pointer rounded-lg bg-red-500 px-3 py-2 text-sm text-white outline-none transition-colors hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                >
                    {m["delete"]()}
                </button>
            </div>
        </div>
    </div>
{/if}
