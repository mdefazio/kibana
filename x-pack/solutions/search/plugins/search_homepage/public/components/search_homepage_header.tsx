/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiPageTemplate,

  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  useEuiTheme,
  EuiPanel,
  EuiText,
  EuiTitle,
  EuiSpacer,
  useCurrentEuiBreakpoint
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import SearchHomePageImageLight from '../assets/search_homepage_light.svg';
import SearchHomePageImageDark from '../assets/search_homepage_dark.svg';

export const SearchHomepageHeader: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const { colorMode } = useEuiTheme();
    const currentBreakpoint = useCurrentEuiBreakpoint();

  return (
    <EuiPageTemplate.Section
      data-test-subj="search-homepage-header"
      paddingSize="none"
      color="subdued"
    >
      <EuiFlexGroup
        gutterSize="m"
        alignItems="stretch"
        direction={
          (currentBreakpoint === "s") || (currentBreakpoint === "m") || (currentBreakpoint === "l")
            ? "columnReverse"
            : "row"
        }
      >
        <EuiFlexItem style={{ alignSelf: 'center' }}>
          <EuiPanel color="transparent" paddingSize="xl">
            <EuiTitle size="l">
              <h1>
                {i18n.translate('xpack.searchHomepage.pageTitle', {
                  defaultMessage: 'Your vector database just got faster',
                })}
              </h1>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText grow={false}>
              <p>
                {i18n.translate('xpack.searchHomepage.description', {
                  defaultMessage:
                    'Elasticsearch and Lucene now offer “Better binary quantization”, delivering ~95% memory reduction while maintaining high ranking quality.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="xl" />
            <EuiFlexGroup gutterSize="xl">
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="checkInCircleFilled" color="primary" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {i18n.translate('xpack.searchHomepage.featureUpdateLabel', {
                      defaultMessage: 'Feature update',
                    })}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="checkInCircleFilled" color="primary" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {i18n.translate('xpack.searchHomepage.featureUpdateLabel', {
                      defaultMessage: 'Feature update',
                    })}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="s">
                  <EuiFlexItem grow={false}>
                    <EuiIcon type="checkInCircleFilled" color="primary" />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    {i18n.translate('xpack.searchHomepage.featureUpdateLabel', {
                      defaultMessage: 'Feature update',
                    })}
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem>
          <p>image</p>
          {/* {colorMode === 'LIGHT' ? <SearchHomePageImageLight /> : <SearchHomePageImageDark />} */}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPageTemplate.Section>
  );
};
