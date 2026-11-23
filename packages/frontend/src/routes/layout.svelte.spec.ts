/**********************************************************************
 * Copyright (C) 2026 Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ***********************************************************************/
import '@testing-library/jest-dom/vitest';

import { render } from '@testing-library/svelte';
import { createRawSnippet, tick } from 'svelte';
import { beforeEach, expect, test, vi } from 'vitest';
import type { RpcBrowser } from '@podman-desktop/extension-hummingbird-core-api';
import Layout from './+layout.svelte';
import { afterNavigate, goto } from '$app/navigation';
import { getRouterState, podmanDesktopHistory, rpcBrowser } from '#api/client.js';

// eslint-disable-next-line vitest/prefer-import-in-mock
vi.mock('@fortawesome/fontawesome-free/css/all.min.css', () => ({}));
// eslint-disable-next-line vitest/prefer-import-in-mock
vi.mock('../app.css', () => ({}));
vi.mock(import('$app/navigation'));
vi.mock(import('$app/state'), () => ({ page: { data: { label: 'Alternatives' } } }) as never);
vi.mock(import('#lib/navigations/Navigation.svelte'));
vi.mock(import('#api/client.js'), () => ({
  getRouterState: vi.fn(),
  rpcBrowser: { subscribe: vi.fn() } as unknown as RpcBrowser,
  podmanDesktopHistory: { push: vi.fn(), onDidNavigate: vi.fn() },
}));

const historyDisposable = { dispose: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getRouterState).mockResolvedValue({ url: '/' });
  vi.mocked(goto).mockResolvedValue(undefined);
  vi.mocked(rpcBrowser.subscribe).mockReturnValue({ unsubscribe: vi.fn() });
  vi.mocked(podmanDesktopHistory!.onDidNavigate).mockReturnValue(historyDisposable);
});

async function renderLayout(): Promise<{ unmount: () => void }> {
  const result = render(Layout, { children: createRawSnippet(() => ({ render: (): string => '<div></div>' })) });
  await vi.waitFor(() => expect(afterNavigate).toHaveBeenCalled());
  await tick();
  return result;
}

type AfterNavigateEvent = Parameters<Parameters<typeof afterNavigate>[0]>[0];

function navigate(from: string, to: string): void {
  const callback = vi.mocked(afterNavigate).mock.calls[0][0];
  callback({
    from: { url: new URL(from, 'http://localhost') },
    to: { url: new URL(to, 'http://localhost') },
  } as unknown as AfterNavigateEvent);
}

test('every route change is pushed to Podman Desktop history', async () => {
  await renderLayout();
  navigate('/', '/images/podman/sha256:abc/report?image=nginx');

  expect(podmanDesktopHistory!.push).toHaveBeenCalledWith({
    id: '/images/podman/sha256:abc/report?image=nginx',
    label: 'Alternatives',
  });
});

test('query-only changes are not pushed', async () => {
  await renderLayout();
  navigate('/?provider=a', '/?provider=b');

  expect(podmanDesktopHistory!.push).not.toHaveBeenCalled();
});

test('navigating back/forward to an entry goes to its route', async () => {
  const { unmount } = await renderLayout();
  const listener = vi.mocked(podmanDesktopHistory!.onDidNavigate).mock.calls[0][0];

  listener({ id: '/alternatives' });
  expect(goto).toHaveBeenCalledWith('/alternatives');

  unmount();
  expect(historyDisposable.dispose).toHaveBeenCalled();
});
