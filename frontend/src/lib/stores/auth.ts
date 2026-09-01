import { get, writable } from "svelte/store";
import { PUBLIC_API_BASE_URL } from "$env/static/public";

interface AuthState {
    accessToken: string | null;
    refreshToken: string | null;
    authEnabled: boolean | null;
}

const STORAGE_KEY = "riptide-auth";

function loadFromStorage(): Pick<AuthState, "accessToken" | "refreshToken"> {
    if (typeof localStorage === "undefined") {
        return { accessToken: null, refreshToken: null };
    }
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { accessToken: null, refreshToken: null };
        return JSON.parse(raw);
    } catch {
        return { accessToken: null, refreshToken: null };
    }
}

function saveToStorage(
    accessToken: string | null,
    refreshToken: string | null,
) {
    if (typeof localStorage === "undefined") return;
    if (accessToken && refreshToken) {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ accessToken, refreshToken }),
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

    return {
        subscribe,
        setTokens(accessToken: string, refreshToken: string) {
            saveToStorage(accessToken, refreshToken);
            update((state) => ({ ...state, accessToken, refreshToken }));
        },
        setAuthEnabled(authEnabled: boolean) {
            update((state) => ({ ...state, authEnabled }));
        },
        clear() {
            saveToStorage(null, null);
            update((state) => ({
                ...state,
                accessToken: null,
                refreshToken: null,
            }));
        },
        async login(email: string, password: string) {
            const response = await fetch(`${PUBLIC_API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                throw new Error("invalid credentials");
            }

            const { accessToken, refreshToken } = await response.json();
            saveToStorage(accessToken, refreshToken);
            set({ accessToken, refreshToken, authEnabled: true });
        },
        async refresh(): Promise<boolean> {
            const state = get(authStore);

            if (!state.refreshToken) {
                return false;
            }

            const response = await fetch(
                `${PUBLIC_API_BASE_URL}/auth/refresh`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refreshToken: state.refreshToken }),
                },
            );

            if (!response.ok) {
                saveToStorage(null, null);
                update((s) => ({
                    ...s,
                    accessToken: null,
                    refreshToken: null,
                }));
                return false;
            }

            const { accessToken, refreshToken } = await response.json();
            saveToStorage(accessToken, refreshToken);
            update((s) => ({ ...s, accessToken, refreshToken }));
            return true;
        },
    };
}

export const authStore = createAuthStore();
