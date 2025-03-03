import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { litellmPlugin, LitellmPage } from '../src/plugin';

createDevApp()
  .registerPlugin(litellmPlugin)
  .addPage({
    element: <LitellmPage />,
    title: 'Root Page',
    path: '/litellm',
  })
  .render();
