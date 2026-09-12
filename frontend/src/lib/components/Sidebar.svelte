<script lang="ts">
import { page } from "$app/state";
import { translateDynKey } from "$lib/utils/translateDynKey";

const links = [
    { href: "/", label: "home", icon: "bx-home" },
    { href: "/artists", label: "artists", icon: "bx-microphone" },
    { href: "/playlists", label: "playlists", icon: "bx-list-ul" },
    { href: "/statistics", label: "stats", icon: "bx-bar-chart-alt-2" },
    { href: "/settings", label: "settings", icon: "bx-cog" },
];
</script>

<nav
    class="flex shrink-0 border-(--color-violet-pale) bg-(--color-surface)
        max-md:flex-row max-md:justify-around max-md:border-t max-md:px-2 max-md:py-2
        md:w-56 md:flex-col md:gap-1 md:border-r md:p-4"
>
    {#each links as link}
        <a
            href={link.href}
            class="flex items-center gap-3 rounded-lg text-sm transition-colors
                max-md:flex-col max-md:gap-0.5 max-md:px-3 max-md:py-1 max-md:text-xs
                md:px-3 md:py-2
                {page.url.pathname === link.href
                ? 'bg-(--color-accent) text-white max-md:bg-transparent max-md:text-(--color-accent)'
                : 'text-(--color-text-muted) hover:bg-(--color-violet-pale)'}"
        >
            <i class="bx {link.icon} text-xl md:text-base"></i>
            <span>{translateDynKey(`nav.${link.label}`)}</span>
        </a>
    {/each}
</nav>
