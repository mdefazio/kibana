/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EndpointCallout } from './endpoint_callout';
import { TestProviders } from '../../../../../../../common/mock/test_providers';
import { mockReportLinkClick } from '../../../../../../../common/lib/integrations/hooks/__mocks__/mocks';

jest.mock('../../../../../../../common/lib/kibana');
jest.mock('../../../../../../../common/lib/integrations/hooks/integration_context');

describe('EndpointCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the callout', () => {
    const { getByTestId, getByText } = render(<EndpointCallout />, { wrapper: TestProviders });

    expect(
      getByText('Orchestrate response across endpoint vendors with bidirectional integrations')
    ).toBeInTheDocument();
    expect(getByTestId('endpointLearnMoreLink')).toBeInTheDocument();
  });

  it('should track the agent link click', () => {
    const { getByTestId } = render(<EndpointCallout />, { wrapper: TestProviders });

    getByTestId('endpointLearnMoreLink').click();

    expect(mockReportLinkClick).toHaveBeenCalledWith('endpoint_learn_more');
  });
});
