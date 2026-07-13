import { EuiLink, EuiIcon, EuiText, EuiSpacer, EuiTitle, EuiFlexGroup, EuiPanel, EuiFlexItem } from '@elastic/eui';
import React from 'react';

interface OnboardingDocPanelProps {
    title: string;
    description: React.ReactNode;
    docsHref: string;
    docsLabel: string;
    telemetryPrefix: string;
}

export const OnboardingDocPanel = ({ title, description, docsHref, docsLabel, telemetryPrefix }: OnboardingDocPanelProps) => {
    return (
        <EuiPanel hasShadow={false} paddingSize="none" color="transparent">
            <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}><EuiIcon type="documentation" aria-hidden={true} />
                </EuiFlexItem>
                <EuiFlexItem grow={true}>
                    <EuiTitle size="xs">
                        <h3>{title}</h3>
                    </EuiTitle>
                </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
                <p>{description}</p>
            </EuiText>
            <EuiSpacer size="m" />
            <EuiLink
                href={docsHref}
                external
                target="_blank"
                data-test-subj="vectordbWizardInfoPanelDocLink"
                data-telemetry-id={`${telemetryPrefix}-infoPanelDocLink`}
            >
                {docsLabel}
            </EuiLink>
        </EuiPanel>
    );
};