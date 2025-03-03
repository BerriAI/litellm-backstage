import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const litellmPlugin = createPlugin({
  id: 'litellm',
  routes: {
    root: rootRouteRef,
  },
});

export const LitellmPage = litellmPlugin.provide(
  createRoutableExtension({
    name: 'LitellmPage',
    component: () =>
      import('./components/LitellmPage/LitellmPage.tsx').then(m => m.LitellmPage),
    mountPoint: rootRouteRef,
  }),
);
