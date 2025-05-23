/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiPanel, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext, useEffect, useState } from 'react';
import styled from '@emotion/styled';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { getLegacyApmHref } from '../../shared/links/apm/apm_link_hooks';
import { useLegacyUrlParams } from '../../../context/url_params_context/use_url_params';
import type { APMQueryParams } from '../../shared/links/url_helpers';
import { CytoscapeContext } from './cytoscape';
import { getAnimationOptions, getNodeHeight } from './cytoscape_options';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';

const ControlsContainer = styled('div')`
  left: ${({ theme }) => theme.euiTheme.size.base};
  position: absolute;
  top: ${({ theme }) => theme.euiTheme.size.s};
  z-index: 1; /* The element containing the cytoscape canvas has z-index = 0. */
`;

const Button = styled(EuiButtonIcon)`
  display: block;
  margin: ${({ theme }) => theme.euiTheme.size.xs};
`;

const ZoomInButton = styled(Button)`
  margin-bottom: ${({ theme }) => theme.euiTheme.size.s};
`;

const Panel = styled(EuiPanel)`
  margin-bottom: ${({ theme }) => theme.euiTheme.size.s};
`;

const steps = 5;

function doZoom(cy: cytoscape.Core | undefined, increment: number, duration: number) {
  if (cy) {
    const level = cy.zoom() + increment;
    // @ts-expect-error `.position()` _does_ work on a NodeCollection. It returns the position of the first element in the collection.
    const primaryCenter = cy.nodes('.primary').position();
    const { x1, y1, w, h } = cy.nodes().boundingBox({});
    const graphCenter = { x: x1 + w / 2, y: y1 + h / 2 };

    cy.animate({
      duration,
      zoom: {
        level,
        position: primaryCenter || graphCenter,
      },
    });
  }
}

function useDebugDownloadUrl(cy?: cytoscape.Core) {
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>(undefined);
  const debug = sessionStorage.getItem('apm_debug') === 'true';

  // Handle elements changes to update the download URL
  useEffect(() => {
    const elementsHandler: cytoscape.EventHandler = (event) => {
      // @ts-expect-error The `true` argument to `cy.json` is to flatten the elements
      // (instead of having them broken into nodes/edges.) DefinitelyTyped has
      // this wrong.
      const elementsJson = event.cy.json(true)?.elements.map((element) => ({
        data: element.data,
      }));
      setDownloadUrl(
        elementsJson.length > 0 && debug
          ? `data:application/json;charset=utf-8,${encodeURIComponent(
              JSON.stringify({ elements: elementsJson }, null, '  ')
            )}`
          : undefined
      );
    };

    if (cy) {
      cy.on('add remove', elementsHandler);
    }

    return () => {
      if (cy) {
        cy.off('add remove', elementsHandler);
      }
    };
  }, [cy, debug]);

  return downloadUrl;
}

export function Controls() {
  const { core } = useApmPluginContext();
  const { basePath } = core.http;
  const { euiTheme } = useEuiTheme();
  const cy = useContext(CytoscapeContext);
  const { urlParams } = useLegacyUrlParams();

  const {
    query: { kuery },
  } = useAnyOfApmParams(
    '/service-map',
    '/services/{serviceName}/service-map',
    '/mobile-services/{serviceName}/service-map'
  );

  const [zoom, setZoom] = useState((cy && cy.zoom()) || 1);
  const duration = euiTheme.animation.fast ? parseInt(euiTheme.animation.fast, 10) : 0;
  const downloadUrl = useDebugDownloadUrl(cy);
  const viewFullMapUrl = getLegacyApmHref({
    basePath,
    path: '/service-map',
    search: `kuery=${encodeURIComponent(kuery)}`,
    query: urlParams as APMQueryParams,
  });

  // Handle zoom events
  useEffect(() => {
    const zoomHandler: cytoscape.EventHandler = (event) => {
      setZoom(event.cy.zoom());
    };

    if (cy) {
      cy.on('zoom', zoomHandler);
    }

    return () => {
      if (cy) {
        cy.off('zoom', zoomHandler);
      }
    };
  }, [cy]);

  function center() {
    if (cy) {
      const eles = cy.nodes();
      cy.animate({
        ...getAnimationOptions(euiTheme),
        center: { eles },
        fit: { eles, padding: getNodeHeight(euiTheme) },
      });
    }
  }

  function zoomIn() {
    doZoom(cy, increment, duration);
  }

  function zoomOut() {
    doZoom(cy, -increment, duration);
  }

  if (!cy) {
    return null;
  }

  const maxZoom = cy.maxZoom();
  const isMaxZoom = zoom === maxZoom;
  const minZoom = cy.minZoom();
  const isMinZoom = zoom === minZoom;
  const increment = (maxZoom - minZoom) / steps;

  const centerLabel = i18n.translate('xpack.apm.serviceMap.center', {
    defaultMessage: 'Center',
  });
  const downloadLabel = i18n.translate('xpack.apm.serviceMap.download', {
    defaultMessage: 'Download',
  });
  const viewFullMapLabel = i18n.translate('xpack.apm.serviceMap.viewFullMap', {
    defaultMessage: 'View full service map',
  });
  const zoomInLabel = i18n.translate('xpack.apm.serviceMap.zoomIn', {
    defaultMessage: 'Zoom in',
  });
  const zoomOutLabel = i18n.translate('xpack.apm.serviceMap.zoomOut', {
    defaultMessage: 'Zoom out',
  });

  const showViewFullMapButton = cy.nodes('.primary').length > 0;

  return (
    <ControlsContainer>
      <Panel hasShadow={true} paddingSize="none">
        <EuiToolTip anchorClassName="eui-displayInline" content={zoomInLabel}>
          <ZoomInButton
            aria-label={zoomInLabel}
            color="text"
            disabled={isMaxZoom}
            iconType="plusInCircleFilled"
            onClick={zoomIn}
          />
        </EuiToolTip>
        <EuiToolTip anchorClassName="eui-displayInline" content={zoomOutLabel}>
          <Button
            aria-label={zoomOutLabel}
            color="text"
            disabled={isMinZoom}
            iconType="minusInCircleFilled"
            onClick={zoomOut}
          />
        </EuiToolTip>
      </Panel>
      <Panel hasShadow={true} paddingSize="none">
        <EuiToolTip anchorClassName="eui-displayInline" content={centerLabel}>
          <Button
            data-test-subj="centerServiceMap"
            aria-label={centerLabel}
            color="text"
            iconType="crosshairs"
            onClick={center}
          />
        </EuiToolTip>
      </Panel>
      {showViewFullMapButton && (
        <Panel hasShadow={true} paddingSize="none">
          <EuiToolTip anchorClassName="eui-displayInline" content={viewFullMapLabel}>
            <Button
              aria-label={viewFullMapLabel}
              color="text"
              data-test-subj="viewFullMapButton"
              href={viewFullMapUrl}
              iconType="apps"
            />
          </EuiToolTip>
        </Panel>
      )}
      {downloadUrl && (
        <Panel hasShadow={true} paddingSize="none">
          <EuiToolTip anchorClassName="eui-displayInline" content={downloadLabel}>
            <Button
              aria-label={downloadLabel}
              color="text"
              download="service-map.json"
              href={downloadUrl}
              iconType="download"
            />
          </EuiToolTip>
        </Panel>
      )}
    </ControlsContainer>
  );
}
