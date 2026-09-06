<script lang="ts">
    import { page } from "$app/state";

    const links = [
        { href: "/", label: "Home", icon: "bx-home" },
        { href: "/artists", label: "Artists", icon: "bx-microphone" },
        { href: "/playlists", label: "Playlists", icon: "bx-list-ul" },
        { href: "/statistics", label: "Stats", icon: "bx-bar-chart-alt-2" },
        { href: "/settings", label: "Settings", icon: "bx-cog" },
    ];
</script>

<nav
    class="flex shrink-0 border-violet-100 bg-white
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
                ? 'bg-violet-500 text-white max-md:bg-transparent max-md:text-violet-600'
                : 'text-neutral-500 hover:bg-violet-100'}"
        >
            <i class="bx {link.icon} text-xl md:text-base"></i>
            <span>{link.label}</span>
        </a>
    {/each}
</nav>
