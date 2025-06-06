/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { waitFor, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import {
  noCasesPermissions,
  onlyDeleteCasesPermission,
  renderWithTestingProviders,
} from '../../../common/mock';
import { RegisteredAttachmentsPropertyActions } from './registered_attachments_property_actions';
import { AttachmentActionType } from '../../../client/attachment_framework/types';

// FLAKY: https://github.com/elastic/kibana/issues/207328
describe.skip('RegisteredAttachmentsPropertyActions', () => {
  const props = {
    isLoading: false,
    registeredAttachmentActions: [],
    onDelete: jest.fn(),
    hideDefaultActions: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the correct number of actions', async () => {
    renderWithTestingProviders(<RegisteredAttachmentsPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-ellipses'));

    expect(await screen.findByTestId('property-actions-user-action-group')).toBeInTheDocument();
  });

  it('renders the modal info correctly', async () => {
    renderWithTestingProviders(<RegisteredAttachmentsPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect(await screen.findByTestId('property-actions-user-action-trash')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-trash'));

    expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();

    expect(await screen.findByTestId('confirmModalTitleText')).toHaveTextContent(
      'Delete attachment'
    );

    expect(await screen.findByText('Delete')).toBeInTheDocument();
  });

  it('remove attachments correctly', async () => {
    renderWithTestingProviders(<RegisteredAttachmentsPropertyActions {...props} />);

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect(await screen.findByTestId('property-actions-user-action-trash')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-trash'));

    expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();

    await userEvent.click(await screen.findByText('Delete'));

    await waitFor(() => {
      expect(props.onDelete).toHaveBeenCalled();
    });
  });

  it('does not show the property actions without delete permissions', async () => {
    renderWithTestingProviders(<RegisteredAttachmentsPropertyActions {...props} />, {
      wrapperProps: { permissions: noCasesPermissions() },
    });

    expect(screen.queryByTestId('property-actions-user-action')).not.toBeInTheDocument();
  });

  it('does not show the property actions when hideDefaultActions is enabled', async () => {
    renderWithTestingProviders(
      <RegisteredAttachmentsPropertyActions {...props} hideDefaultActions={true} />
    );

    expect(screen.queryByTestId('property-actions-user-action')).not.toBeInTheDocument();
  });

  it('does show the property actions with only delete permissions', async () => {
    renderWithTestingProviders(<RegisteredAttachmentsPropertyActions {...props} />, {
      wrapperProps: { permissions: onlyDeleteCasesPermission() },
    });

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();
  });

  it('renders correctly registered attachments', async () => {
    const onClick = jest.fn();
    const action = [
      {
        type: AttachmentActionType.BUTTON as const,
        label: 'My button',
        iconType: 'download',
        onClick,
      },
    ];

    renderWithTestingProviders(
      <RegisteredAttachmentsPropertyActions {...props} registeredAttachmentActions={action} />
    );

    expect(await screen.findByTestId('property-actions-user-action')).toBeInTheDocument();

    await userEvent.click(await screen.findByTestId('property-actions-user-action-ellipses'));
    await waitForEuiPopoverOpen();

    expect(await screen.findByTestId('property-actions-user-action-trash')).toBeInTheDocument();
    expect(await screen.findByTestId('property-actions-user-action-download')).toBeInTheDocument();
  });
});
