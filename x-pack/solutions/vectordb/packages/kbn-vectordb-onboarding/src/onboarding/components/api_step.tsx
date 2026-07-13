/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  EuiTabs,
  EuiTab,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { useKibana } from '../../services';
import { DEFAULT_LANGUAGE, LANGUAGES, type Language, type SnippetSet } from './languages';
import { fillPlaceholders } from './snippets';
import { useOnboardingCredentials } from '../../hooks/use_onboarding_credentials';
import type { VectorPath, WizardStep } from '../types';
import { OnboardingDocPanel } from './onboarding_doc_panel';

const SNIPPET_OVERFLOW_HEIGHT = 420;

interface InfoPanelProps {
  title: string;
  description: React.ReactNode;
  docsLabel: string;
  docsHref: string;
}

interface ApiStepProps {
  snippets: SnippetSet;
  consoleRequest: string;
  consoleComment: string;
  infoPanel: InfoPanelProps;
  step: WizardStep;
  path: VectorPath;
  tabs: boolean;
}

export const ApiStep = ({
  snippets,
  consoleRequest,
  consoleComment,
  infoPanel,
  step,
  path,
  tabs,
}: ApiStepProps) => {
  const {
    services: { application, share, console: consolePlugin },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const { elasticsearchUrl, apiKey } = useOnboardingCredentials();
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [isLanguagePopoverOpen, setIsLanguagePopoverOpen] = useState(false);
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);

  const selectedLanguage = LANGUAGES.find((l) => l.id === language);
  const syntax = selectedLanguage?.syntax ?? 'python';
  const renderedSnippet = fillPlaceholders(
    snippets[language],
    elasticsearchUrl ?? undefined,
    apiKey ?? undefined
  );
  const [selectedTabId, setSelectedTabId] = useState('semantic');

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };


  const telemetryPrefix = `vectordbOnboarding-${step}-${path}`;

  const languageMenuItems = LANGUAGES.map((lang) => (
    <EuiContextMenuItem
      key={lang.id}
      icon={<EuiIcon type={lang.icon} size="m" aria-hidden={true} />}
      onClick={() => {
        setLanguage(lang.id);
        setIsLanguagePopoverOpen(false);
      }}
      aria-label={i18n.translate('vectordbOnboarding.wizard.languageChangeAriaLabel', {
        defaultMessage: 'Change language to {language}',
        values: { language: lang.label },
      })}
      data-test-subj={`vectordbWizardLanguageOption-${lang.id}`}
      data-telemetry-id={`${telemetryPrefix}-selectLanguage-${lang.id}`}
    >
      {lang.label}
    </EuiContextMenuItem>
  ));

  const requestWithComment = `
# ===============================================
# 🚀 ${consoleComment}
# ===============================================
\n${consoleRequest}`;

  return (
    <>
      <EuiPanel paddingSize="s" hasBorder={false} hasShadow={false} color="subdued">
        <EuiPanel paddingSize="none" hasBorder={false} hasShadow={true} color="plain">
          <EuiPanel paddingSize="s" hasShadow={false} color="transparent">
            <EuiFlexGroup
              justifyContent="flexEnd"
              alignItems="center"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={true}>
                {tabs && (
                  <EuiTabs bottomBorder={false} size="s">
                    <EuiTab key="semantic" id="semantic" isSelected={selectedTabId === 'semantic'} onChange={() => onSelectedTabChanged('semantic')}>Semantic</EuiTab>
                    <EuiTab key="hybrid" id="hybrid" isSelected={selectedTabId === 'hybrid'} onChange={() => onSelectedTabChanged('hybrid')}>Hybrid</EuiTab>
                  </EuiTabs>
                )}
              </EuiFlexItem>

              <EuiFlexItem grow={false}>
                <EuiPopover
                  button={
                    <EuiButtonEmpty
                      size="s"
                      iconType="arrowDown"
                      color="text"
                      iconSide="right"
                      onClick={() => setIsLanguagePopoverOpen(!isLanguagePopoverOpen)}
                      data-test-subj="vectordbWizardLanguagePicker"
                      data-telemetry-id={`${telemetryPrefix}-openLanguagePicker`}
                    >
                      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                        {selectedLanguage?.icon && (
                          <EuiFlexItem grow={false}>
                            <EuiIcon type={selectedLanguage.icon} size="m" aria-hidden={true} />
                          </EuiFlexItem>
                        )}
                        <EuiFlexItem grow={false}>{selectedLanguage?.label}</EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiButtonEmpty>
                  }
                  isOpen={isLanguagePopoverOpen}
                  closePopover={() => setIsLanguagePopoverOpen(false)}
                  panelPaddingSize="none"
                  anchorPosition="downLeft"
                  aria-label={i18n.translate('vectordbOnboarding.wizard.languagePickerLegend', {
                    defaultMessage: 'Select a programming language for code snippets',
                  })}
                >
                  <EuiContextMenuPanel items={languageMenuItems} />
                </EuiPopover>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiCopy textToCopy={renderedSnippet}>
                      {(copy) => (
                        <EuiButton
                          size="s"
                          color="text"
                          iconType="copy"
                          iconSide="right"
                          onClick={copy}
                          data-test-subj="vectordbWizardCopyCode"
                          data-telemetry-id={`${telemetryPrefix}-copyCode`}
                        >
                          {i18n.translate('vectordbOnboarding.wizard.copyCode', {
                            defaultMessage: 'Copy',
                          })}
                        </EuiButton>
                      )}
                    </EuiCopy>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>

          <EuiHorizontalRule margin="none" />

          <EuiCodeBlock
            language={syntax}
            lineNumbers
            fontSize="m"
            paddingSize="m"
            overflowHeight={SNIPPET_OVERFLOW_HEIGHT}
            transparentBackground
            data-test-subj="vectordbWizardSnippet"
          >
            {renderedSnippet}
          </EuiCodeBlock>
        </EuiPanel >
        <EuiSpacer size="xs" />
        <EuiPanel paddingSize="s" hasBorder={false} hasShadow={false} color="transparent">
          <EuiFlexGroup gutterSize="s" direction="row" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}><EuiIcon color='subdued' size='m' type="bulb" aria-hidden={true} /></EuiFlexItem>
            <EuiFlexItem grow={true}><EuiText size="s" color="subdued">
              <p>You can use our interactive console to easily send requests to the Elasticsearch REST API</p>
            </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <TryInConsoleButton
                key="runInConsole"
                request={requestWithComment}
                application={application}
                consolePlugin={consolePlugin}
                sharePlugin={share}
                type="contextMenuItem"
                iconType="play"
                onClick={() => setIsActionsPopoverOpen(false)}
                data-test-subj="vectordbWizardRunInConsole"
                telemetryId={`${telemetryPrefix}-runInConsole`}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPanel >
      <EuiSpacer size="xl" />
      {/* TODO: This needs cleaning up. The two separate documentation links can now be passed as an array and mapped here. */}
      <EuiFlexGroup gutterSize="s" direction="column" alignItems="flexStart" responsive={false}>
        <OnboardingDocPanel
          title={infoPanel.title}
          description={infoPanel.description}
          docsHref={infoPanel.docsHref}
          docsLabel={infoPanel.docsLabel}
          telemetryPrefix={telemetryPrefix}
        />
        <EuiHorizontalRule margin="s" />
        <OnboardingDocPanel
          title={infoPanel.title}
          description={infoPanel.description}
          docsHref={infoPanel.docsHref}
          docsLabel={infoPanel.docsLabel}
          telemetryPrefix={telemetryPrefix}
        />
      </EuiFlexGroup>
    </>
  );
};
