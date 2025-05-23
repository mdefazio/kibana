/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { isArray } from 'lodash';
import { indexTemplates } from '../data_sources';
import type { Config, IndexTemplateDef } from '../types';

export async function installIndexTemplate(
  config: Config,
  client: Client,
  logger: ToolingLog
): Promise<void> {
  if (config.indexing.slashLogs) {
    return Promise.resolve();
  }
  const { dataset } = config.indexing;
  const templates = indexTemplates[dataset];
  const templateNames = templates.map((templateDef) => templateDef.name).join(',');
  logger.info(`Installing index templates (${templateNames})`);
  for (const indexTemplateDef of templates) {
    const componentNames = indexTemplateDef.components.map(({ name }) => name);
    logger.info(`Installing components for ${indexTemplateDef.name} (${componentNames})`);
    for (const component of indexTemplateDef.components) {
      await client.cluster.putComponentTemplate({
        name: component.name,
        ...(component.template as Omit<IndexTemplateDef, 'name'>),
      });
    }
    logger.info(`Installing index template (${indexTemplateDef.name})`);
    // Clone the template and add the base component name
    const template = { ...indexTemplateDef.template };
    if (isArray(template.composed_of)) {
      template.composed_of.push('kbn-data-forge@mappings');
    }
    await client.indices.putIndexTemplate({
      name: indexTemplateDef.name,
      body: template,
    });
  }
}
