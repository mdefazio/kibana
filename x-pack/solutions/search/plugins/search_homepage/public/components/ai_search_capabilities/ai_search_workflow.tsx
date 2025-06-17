/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiImage,
  EuiTitle,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';

import { CREATE_INDEX } from '../../../common/constants';
import { useKibana } from '../../hooks/use_kibana';

import { WorkflowFeatureBullet } from './workflow_feature_bullet';

interface WorkflowProps {
  
    image: string;
    imageAlt: string;
    heading: string;
    subheading: string;
    featureBullets: Array<string>;
    buttonLabel: string;
    buttonTelem: string;
  
}

// { image, imageAlt, heading, subheading, featureBullets, buttonLabel, buttonTelem }

export const AISearchWorkflow = ({ capability }: {capability:WorkflowProps}) => {
  const { http } = useKibana().services;

  return (
    <EuiPanel color="transparent" paddingSize="s">
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiImage src={capability.image} alt={capability.imageAlt} size="s" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h4>{capability.heading}</h4>
          </EuiTitle>
          <EuiSpacer size="xs" />
          <EuiText size="m" color="subdued">
            <p>{capability.subheading}</p>
          </EuiText>
          <EuiSpacer size="s" />

          <EuiFlexGroup direction="column" gutterSize="xs">
            {capability.featureBullets.map((item: string, index: number) => (
              <EuiFlexItem grow={false}>
                <WorkflowFeatureBullet feature={item} key={index} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer />

          <span>
            <EuiButton
              iconType="plusInCircle"
              href={http.basePath.prepend(CREATE_INDEX)}
              target="_blank"
              data-test-subj={capability.buttonTelem}
            >
              {capability.buttonLabel}
            </EuiButton>
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
