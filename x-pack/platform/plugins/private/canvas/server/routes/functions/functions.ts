/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeProvider } from '@kbn/expressions-plugin/common';
import { schema } from '@kbn/config-schema';
import { RouteInitializerDeps } from '..';
import { API_ROUTE_FUNCTIONS } from '../../../common/lib/constants';

interface FunctionCall {
  functionName: string;
  args: Record<string, any>;
  context: Record<string, any>;
}

export function initializeGetFunctionsRoute(deps: RouteInitializerDeps) {
  const { router, expressions } = deps;
  router.versioned
    .get({
      path: API_ROUTE_FUNCTIONS,
      access: 'internal',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because it only provides non-sensitive information about functions available to Canvas.',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: false,
      },
      async (context, request, response) => {
        const functions = expressions.getFunctions('canvas');
        const body = JSON.stringify(functions);
        return response.ok({
          body,
        });
      }
    );
}

export function initializeBatchFunctionsRoute(deps: RouteInitializerDeps) {
  const { router, expressions } = deps;
  router.versioned
    .post({
      path: API_ROUTE_FUNCTIONS,
      access: 'internal',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because data source expressions that perform search operations use the Kibana search client which handles permission checking.',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: schema.object({
              functionName: schema.string(),
              args: schema.object({}, { unknowns: 'allow' }),
              context: schema.object({}, { unknowns: 'allow' }),
            }),
          },
        },
      },
      async (context, request, response) => {
        const handlers = {
          environment: 'server',
        };
        const fnCall: FunctionCall = {
          functionName: request.body.functionName,
          args: request.body.args,
          context: request.body.context,
        };
        const result = await runFunction(handlers, fnCall);
        if (typeof result === 'undefined') {
          throw new Error(`Function ${fnCall.functionName} did not return anything.`);
        }
        return response.ok({
          body: result,
        });
      }
    );

  async function runFunction(handlers: { environment: string }, fnCall: FunctionCall) {
    const { functionName, args, context } = fnCall;
    const { deserialize } = serializeProvider(expressions.getTypes());

    const fnDef = expressions.getFunctions('canvas')[functionName];
    if (!fnDef) throw new Error(`Function "${functionName}" could not be found.`);

    const deserialized = deserialize(context);
    const result = fnDef.fn(deserialized, args, handlers);

    return result;
  }
}
