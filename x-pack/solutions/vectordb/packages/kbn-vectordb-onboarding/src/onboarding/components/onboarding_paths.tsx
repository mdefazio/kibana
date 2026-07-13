/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory, useLocation } from 'react-router-dom';
import SearchLakeSvg from '../../assets/search_lake.svg';
import VectorSearchSvg from '../../assets/vector_search.svg';
import { OnboardingPathPanel } from './onboarding_path_panel';
import { pathQuery } from '../../hooks/use_wizard_path';
import type { VectorPath } from '../types';
import { ONBOARDING_PATH } from '../../routes';
import { generateTags, storeTags } from './onboarding_data';

interface CardDescriptionProps {
  text: string;
  tags: string[];
}

const CardDescription = ({ text, tags }: CardDescriptionProps) => (
  <>
    <EuiText size="s" color="subdued">
      <p>{text}</p>
    </EuiText>
  </>
);

export const OnboardingPaths = () => {
  const history = useHistory();
  const { pathname } = useLocation();
  const choose = (path: VectorPath) =>
    history.push({
      pathname: `${ONBOARDING_PATH}/ingest`,
      search: pathQuery(path),
      state: { from: pathname },
    });

  return (
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem>
        <OnboardingPathPanel
          dataTestSubj="vectordbPathSelectionGenerate"
          telemetryId="vectordbOnboarding-pathSelection-generateVectors"
          icon={SearchLakeSvg}
          title={i18n.translate('vectordbOnboarding.pathSelection.generate.title', {
            defaultMessage: 'Generate embeddings from your content',
          })}
          description={
            <CardDescription
              text={i18n.translate('vectordbOnboarding.pathSelection.generate.description', {
                defaultMessage:
                  'Bring your content and Elastic handles embedding and indexing using our built-in models.',
              })}
              tags={generateTags}
            />
          }
          onClick={() => choose('generate-vectors')}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        <OnboardingPathPanel
          dataTestSubj="vectordbPathSelectionStore"
          telemetryId="vectordbOnboarding-pathSelection-haveVectors"
          icon={VectorSearchSvg}
          title={i18n.translate('vectordbOnboarding.pathSelection.store.title', {
            defaultMessage: 'Store and search my vectors',
          })}
          description={
            <CardDescription
              text={i18n.translate('vectordbOnboarding.pathSelection.store.description', {
                defaultMessage:
                  'Ingest your vectors into optimized storage and quickly start running your queries.',
              })}
              tags={storeTags}
            />
          }
          onClick={() => choose('have-vectors')}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
