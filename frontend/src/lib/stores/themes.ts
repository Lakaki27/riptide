import { writable } from "svelte/store";

type Theme = "light" | "dark" | "system";

function applyTheme(theme: Theme) {
    const root = document.documentElement;
    if (theme === "system") {
        delete root.dataset.theme;
    } else {
        root.dataset.theme = theme;
    }
    localStorage.setItem("riptide-theme", theme);
}

function createThemeStore() {
    const stored =
        (typeof localStorage !== "undefined" &&
            (localStorage.getItem("riptide-theme") as Theme)) ||
        "system";
    const { subscribe, set } = writable<Theme>(stored);

    return {
        subscribe,
        set(theme: Theme) {
            applyTheme(theme);
            set(theme);
        },
        init() {
            applyTheme(stored);
        },
    };
}

export const themeStore = createThemeStore();
