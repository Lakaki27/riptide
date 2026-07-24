import { get } from "svelte/store";
import { PUBLIC_API_BASE_URL } from "$env/static/public";
import { authStore } from "./stores/auth";

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

	return fetch(`${PUBLIC_API_BASE_URL}${path}`, {
		...rest,
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

	if (response.status === 204) {
		return undefined as T;
	}

	return response.json();
}
