<script lang="ts">
    import { m } from "$lib/paraglide/messages";
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-4 p-8">
    <h1 class="text-2xl">
        {m["legal_disclaimer_download_title"]()}
    </h1>
    {@html m["legal_disclaimer_download_text"]()}
</div>
