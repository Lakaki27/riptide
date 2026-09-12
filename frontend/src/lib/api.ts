import { get } from "svelte/store";
import { goto } from "$app/navigation";
import { m } from "./paraglide/messages";
import { authStore } from "./stores/auth";

interface ApiOptions extends RequestInit {
    skipAuth?: boolean;
    skipJsonContentType?: boolean;
}

async function rawFetch(path: string, options: ApiOptions): Promise<Response> {
    const { skipAuth, skipJsonContentType, headers, ...rest } = options;
    const finalHeaders = new Headers(headers);

    if (!skipJsonContentType) {
        finalHeaders.set("Content-Type", "application/json");
    }

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

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
    let response = await rawFetch(path, options);

    if (response.status === 401 && !options.skipAuth) {
        const refreshed = await authStore.refresh();
        if (refreshed) {
            response = await rawFetch(path, options);
        } else {
            authStore.clear();
            goto("/auth");
            throw new Error(m["session_expired"]());
        }
    }

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: m["unknown_error"]() }));
        throw new Error(
            errorBody.error ?? m["request_failed_with_status"]({ status: response.status }),
        );
    }

    if (response.status === 204) return undefined as T;
    return response.json();
}
