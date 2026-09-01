<script lang="ts">
    import { page } from "$app/state";

    const links = [
        { href: "/", label: "Home" },
        { href: "/artists", label: "Artists" },
        { href: "/playlists", label: "Playlists" },
        { href: "/statistics", label: "Statistics" },
    ];
</script>

<nav class="flex w-48 flex-col gap-1 border-r border-violet-100 bg-white p-4">
    {#each links as link}
        <a
            href={link.href}
            class="rounded px-3 py-2 text-sm {page.url.pathname === link.href
                ? 'bg-violet-500 text-white'
                : 'text-neutral-500 hover:bg-violet-100'}"
        >
            {link.label}
        </a>
    {/each}
</nav>
