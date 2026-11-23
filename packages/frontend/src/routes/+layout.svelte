<script lang="ts">
// app.css includes tailwind css dependencies that we use
import '../app.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { onMount } from 'svelte';
import { getRouterState, podmanDesktopHistory, rpcBrowser } from '#api/client.js';
import { afterNavigate, goto } from '$app/navigation';
import { page } from '$app/state';
import { Messages } from '@podman-desktop/extension-hummingbird-core-api';
import Navigation from '#lib/navigations/Navigation.svelte';

let { children } = $props();

const state = await getRouterState();
if (state.url !== '/' && state.url !== page.url.pathname) {
  // eslint-disable-next-line svelte/no-navigation-without-resolve
  goto(state.url).catch(console.error);
}

// register every route in Podman Desktop's back/forward history
afterNavigate(({ from, to }) => {
  // query-only changes (e.g. catalog provider selection) are not history entries
  if (!to || from?.url.pathname === to.url.pathname) return;
  podmanDesktopHistory?.push({ id: `${to.url.pathname}${to.url.search}`, label: page.data.label ?? 'Hummingbird' });
});

onMount(() => {
  const unsubscribe = rpcBrowser.subscribe(Messages.ROUTE_UPDATE, location => {
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(location).catch(console.error);
  }).unsubscribe;

  // the user navigated back/forward to one of our history entries
  const history = podmanDesktopHistory?.onDidNavigate(({ id }) => {
    // eslint-disable-next-line svelte/no-navigation-without-resolve
    goto(id).catch(console.error);
  });

  return (): void => {
    unsubscribe();
    history?.dispose();
  };
});
</script>

<div class="flex flex-row w-full h-full">
  <Navigation />
  {@render children()}
</div>
