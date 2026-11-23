<script lang="ts">
// app.css includes tailwind css dependencies that we use
import '../app.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { onMount } from 'svelte';
import { routingAPI, rpcBrowser } from '#api/client.js';
import { afterNavigate, goto } from '$app/navigation';
import { page } from '$app/state';
import { Messages } from '@podman-desktop/extension-hummingbird-core-api';
import Navigation from '#lib/navigations/Navigation.svelte';

let { children } = $props();

// register every route in Podman Desktop's back/forward history
afterNavigate(({ from, to }) => {
  if (!to?.route.id) return;
  // ignore query-only changes (e.g. catalog provider selection)
  if (from?.url.pathname === to.url.pathname) return;
  routingAPI.pushHistory(`${to.url.pathname}${to.url.search}`, page.data.label ?? 'Hummingbird').catch(console.error);
});

onMount(() => {
  const unsubscribe = rpcBrowser.subscribe(Messages.ROUTE_UPDATE, () => {
    // consume the pending route, so it is not replayed on the next webview mount
    routingAPI
      .readRoute()
      .then(async location => {
        if (!location) return;
        // after back/forward, Podman Desktop ignores the next push: it must be pushed exactly once.
        // afterNavigate skips same-pathname navigations, so push it here in that case.
        const samePage = new URL(location, page.url.origin).pathname === page.url.pathname;
        // eslint-disable-next-line svelte/no-navigation-without-resolve
        await goto(location);
        if (samePage) await routingAPI.pushHistory(location, page.data.label ?? 'Hummingbird');
      })
      .catch(console.error);
  }).unsubscribe;

  return (): void => {
    unsubscribe();
  };
});
</script>

<div class="flex flex-row w-full h-full">
  <Navigation />
  {@render children()}
</div>
