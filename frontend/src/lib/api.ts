import { get } from "svelte/store";
import { authStore } from "./stores/auth";
import { goto } from "$app/navigation";

interface ApiOptions extends RequestInit {
    skipAuth?: boolean;
}

async function rawFetch(path: string, options: ApiOptions): Promise<Response> {
    const { skipAuth, headers, ...rest } = options;
    const finalHeaders = new Headers(headers);
    finalHeaders.set("Content-Type", "application/json");

    if (!skipAuth) {
        const auth = get(authStore);
        if (auth.accessToken) {
            finalHeaders.set("Authorization", `Bearer ${auth.accessToken}`);
        }
    }

    return fetch(`/api${path}`, {
        ...rest,
        cache: "no-store",
        headers: finalHeaders,
    });
}

export async function apiFetch<T>(
    path: string,
    options: ApiOptions = {},
): Promise<T> {
    let response = await rawFetch(path, options);

    if (response.status === 401 && !options.skipAuth) {
        const refreshed = await authStore.refresh();
        if (refreshed) {
            response = await rawFetch(path, options);
        } else {
            authStore.clear();
            goto("/auth");
            throw new Error("session expired");
        }
    }

    if (!response.ok) {
        const errorBody = await response
            .json()
            .catch(() => ({ error: "unknown error" }));
        throw new Error(
            errorBody.error ?? `request failed with status ${response.status}`,
        );
    }

    if (response.status === 204) return undefined as T;
    return response.json();
}
