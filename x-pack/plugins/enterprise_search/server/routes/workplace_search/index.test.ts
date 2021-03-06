/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockDependencies, MockRouter } from '../../__mocks__';

import { registerWorkplaceSearchRoutes } from './';

describe('registerWorkplaceSearchRoutes', () => {
  it('runs without errors', () => {
    const mockRouter = new MockRouter({} as any);
    registerWorkplaceSearchRoutes({ ...mockDependencies, router: mockRouter.router });
  });
});
