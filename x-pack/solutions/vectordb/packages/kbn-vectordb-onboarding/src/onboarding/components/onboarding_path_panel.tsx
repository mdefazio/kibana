/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type ReactNode } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiSplitPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';

interface OnboardingPathPanelProps {
  icon: string;
  title: string;
  description: ReactNode;
  onClick: () => void;
  dataTestSubj: string;
  telemetryId: string;
}

export const OnboardingPathPanel = ({
  icon,
  title,
  description,
  onClick,
  dataTestSubj,
  telemetryId,
}: OnboardingPathPanelProps) => {
  const { euiTheme } = useEuiTheme();

  return (
    // The EuiPanel wrapper here is a temporary fix as there is an EUI bug which causes a style
    // conflict with direction="row" on EuiSplitPanel.Outer when an onClick is added
    <EuiPanel
      element="div"
      onClick={onClick}
      data-test-subj={dataTestSubj}
      data-telemetry-id={telemetryId}
      hasBorder
      paddingSize="none"
      color="plain"
      css={{
        // '&:hover': {
        //   backgroundColor: euiTheme.colors.backgroundBasePrimary,
        // },
        // EuiPanel hasBorder uses a ::after pseudo-element for the border
        '&:hover::after': {
          borderColor: euiTheme.colors.primary,
        },
        // Split panel children paint their own opaque backgrounds
        '&:hover .euiSplitPanel, &:hover .euiSplitPanel__inner__icon-panel': {
          backgroundColor: euiTheme.colors.backgroundBasePrimary,
        },
      }}
    >
      <EuiSplitPanel.Outer
        direction="row"
        hasBorder={false}
        hasShadow={false}
        color="transparent"
        css={{ height: '100%' }}
      >
        <EuiSplitPanel.Inner color="subdued" grow={false} paddingSize="l" className='euiSplitPanel__inner__icon-panel'>
          <EuiFlexGroup alignItems="center" justifyContent="center" css={{ height: '100%' }}>
            <EuiFlexItem grow={false}>
              <EuiImage size={euiTheme.base * 4} src={icon} alt="" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
        <EuiSplitPanel.Inner paddingSize="l" color="plain">
          <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiTitle size="s">
                <h2>{title}</h2>
              </EuiTitle>
            </EuiFlexGroup>
            <EuiText color="subdued" size="s">
              {description}
            </EuiText>
            <EuiSpacer size="xs" />
            <EuiButtonEmpty color="text" iconSide='right' iconType="sortRight" flush="left" onClick={onClick}>Get started</EuiButtonEmpty>
          </EuiFlexGroup>
        </EuiSplitPanel.Inner>
      </EuiSplitPanel.Outer>
    </EuiPanel>
  );
};
