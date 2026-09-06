import { writable, get } from "svelte/store";

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    authEnabled: boolean | null;
    role: "admin" | "user" | null;
}

const STORAGE_KEY = "riptide-auth";

function decodeRole(token: string): "admin" | "user" | null {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        return payload.role ?? null;
    } catch {
        return null;
    }
}

function loadFromStorage(): Pick<
    AuthState,
    "accessToken" | "refreshToken" | "role"
> {
    if (typeof localStorage === "undefined") {
        return { accessToken: null, refreshToken: null, role: null };
    }
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { accessToken: null, refreshToken: null, role: null };
        return JSON.parse(raw);
    } catch {
        return { accessToken: null, refreshToken: null, role: null };
    }
}

function saveToStorage(
    accessToken: string | null,
    refreshToken: string | null,
    role: "admin" | "user" | null,
) {
    if (typeof localStorage === "undefined") return;
    if (accessToken && refreshToken) {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ accessToken, refreshToken, role }),
        );
    } else {
        localStorage.removeItem(STORAGE_KEY);
    }
}

function createAuthStore() {
    const { subscribe, set, update } = writable<AuthState>({
        ...loadFromStorage(),
        authEnabled: null,
    });

    function applyTokens(accessToken: string, refreshToken: string) {
        const role = decodeRole(accessToken);
        saveToStorage(accessToken, refreshToken, role);
        set({ accessToken, refreshToken, authEnabled: true, role });
    }

    return {
        subscribe,
        setAuthEnabled(authEnabled: boolean) {
            update((state) => ({ ...state, authEnabled }));
        },
        clear() {
            saveToStorage(null, null, null);
            update((state) => ({
                ...state,
                accessToken: null,
                refreshToken: null,
                role: null,
            }));
        },
        async login(email: string, password: string) {
            const response = await fetch(`/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error ?? "invalid credentials");
            }

            const data = await response.json();

            if (data.needsPasswordReset) {
                return {
                    needsPasswordReset: true as const,
                    resetToken: data.resetToken as string,
                };
            }

            applyTokens(data.accessToken, data.refreshToken);
            return { needsPasswordReset: false as const };
        },
        async completeReset(resetToken: string, newPassword: string) {
            const response = await fetch(
                `/api/auth/complete-reset`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ resetToken, newPassword }),
                },
            );

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error ?? "failed to reset password");
            }

            const data = await response.json();
            applyTokens(data.accessToken, data.refreshToken);
        },
        async refresh(): Promise<boolean> {
            const state = get(authStore);

            if (!state.refreshToken) {
                return false;
            }

            const response = await fetch(
                `/api/auth/refresh`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refreshToken: state.refreshToken }),
                },
            );

            if (!response.ok) {
                saveToStorage(null, null, null);
                update((s) => ({
                    ...s,
                    accessToken: null,
                    refreshToken: null,
                    role: null,
                }));
                return false;
            }

            const data = await response.json();
            applyTokens(data.accessToken, data.refreshToken);
            return true;
        },
    };
}

export const authStore = createAuthStore();
