/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiTabbedContent,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Response } from '../../types';
import { OutputTab } from './output_tab';
import { ParametersTab } from './parameters_tab';
import { ContextTab } from './context_tab';

interface Props {
  isLoading: boolean;
  response?: Response;
}

export const OutputPane: FunctionComponent<Props> = ({ isLoading, response }) => {
  const successLabels = (
    <div>
      {isLoading ? (
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : response && response.error ? (
        <EuiFlexGroup alignItems="flexStart" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="alert" color="danger" title="error" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="danger">
              <p>Contains errors</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup alignItems="flexStart" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="check" color="secondary" title="success" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="secondary">
              <p>No errors</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </div>
  );

  return (
    <EuiPanel className="painlessLabRightPane">
      {successLabels}

      <EuiTabbedContent
        className="painlessLabRightPane__tabs"
        size="s"
        display="condensed"
        tabs={[
          {
            id: 'output',
            name: i18n.translate('xpack.painlessLab.outputTabLabel', {
              defaultMessage: 'Output',
            }),
            content: <OutputTab response={response} />,
          },
          {
            id: 'parameters',
            name: i18n.translate('xpack.painlessLab.parametersTabLabel', {
              defaultMessage: 'Parameters',
            }),
            content: <ParametersTab />,
          },
          {
            id: 'context',
            name: i18n.translate('xpack.painlessLab.contextTabLabel', {
              defaultMessage: 'Context',
            }),
            content: <ContextTab />,
          },
        ]}
      />
    </EuiPanel>
  );
};
