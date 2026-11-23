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
import { createRawSnippet } from 'svelte';
import { beforeEach, expect, test, vi } from 'vitest';
import type { RpcBrowser } from '@podman-desktop/extension-hummingbird-core-api';
import { Messages } from '@podman-desktop/extension-hummingbird-core-api';
import Layout from './+layout.svelte';
import { goto } from '$app/navigation';
import { routingAPI, rpcBrowser } from '#api/client.js';

// eslint-disable-next-line vitest/prefer-import-in-mock
vi.mock('@fortawesome/fontawesome-free/css/all.min.css', () => ({}));
// eslint-disable-next-line vitest/prefer-import-in-mock
vi.mock('../app.css', () => ({}));
vi.mock(import('$app/navigation'));
vi.mock(
  import('$app/state'),
  () => ({ page: { data: { label: 'Alternatives' }, url: new URL('http://localhost/alternatives') } }) as never,
);
vi.mock(import('#lib/navigations/Navigation.svelte'));
vi.mock(import('#api/client.js'), () => ({
  rpcBrowser: { subscribe: vi.fn() } as unknown as RpcBrowser,
  routingAPI: { readRoute: vi.fn(), pushHistory: vi.fn() } as unknown as typeof routingAPI,
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(goto).mockResolvedValue(undefined);
  vi.mocked(routingAPI.pushHistory).mockResolvedValue(undefined);
  vi.mocked(rpcBrowser.subscribe).mockReturnValue({ unsubscribe: vi.fn() });
});

function routeUpdate(): void {
  render(Layout, { children: createRawSnippet(() => ({ render: (): string => '<div></div>' })) });
  const call = vi.mocked(rpcBrowser.subscribe).mock.calls.find(([channel]) => channel === Messages.ROUTE_UPDATE);
  if (!call) throw new Error('ROUTE_UPDATE should be subscribed');
  (call[1] as (body: unknown) => void)(undefined);
}

test('restoring an entry on the same page pushes it (afterNavigate skips same-pathname navigations)', async () => {
  vi.mocked(routingAPI.readRoute).mockResolvedValue('/alternatives');

  routeUpdate();

  await vi.waitFor(() => expect(routingAPI.pushHistory).toHaveBeenCalledWith('/alternatives', 'Alternatives'));
  expect(goto).toHaveBeenCalledWith('/alternatives');
});

test('restoring an entry on another page does not push it again (afterNavigate does)', async () => {
  vi.mocked(routingAPI.readRoute).mockResolvedValue('/images/podman/sha256:abc/report?image=nginx');

  routeUpdate();

  await vi.waitFor(() => expect(goto).toHaveBeenCalledWith('/images/podman/sha256:abc/report?image=nginx'));
  expect(routingAPI.pushHistory).not.toHaveBeenCalled();
});

test('nothing is pushed when there is no pending route', async () => {
  vi.mocked(routingAPI.readRoute).mockResolvedValue(undefined);

  routeUpdate();

  await vi.waitFor(() => expect(routingAPI.readRoute).toHaveBeenCalled());
  expect(goto).not.toHaveBeenCalled();
  expect(routingAPI.pushHistory).not.toHaveBeenCalled();
});
