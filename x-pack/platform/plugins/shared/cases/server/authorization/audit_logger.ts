/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsEvent } from '@kbn/core/server';
import type { AuditEvent, AuditLogger } from '@kbn/security-plugin/server';
import type { OperationDetails } from '.';
import { DATABASE_CATEGORY, ECS_OUTCOMES, isWriteOperation } from '.';
import type { OwnerEntity } from './types';

interface CreateAuditMsgParams {
  operation: OperationDetails;
  entity?: OwnerEntity;
  error?: Error;
}

/**
 * Audit logger for authorization operations
 */
export class AuthorizationAuditLogger {
  private readonly auditLogger: AuditLogger;

  constructor(logger: AuditLogger) {
    this.auditLogger = logger;
  }

  /**
   * Creates an AuditEvent describing the state of a request.
   */
  private static createAuditMsg({ operation, error, entity }: CreateAuditMsgParams): AuditEvent {
    const doc =
      entity?.id !== undefined
        ? `${operation.savedObjectType} [id=${entity.id}]`
        : `a ${operation.docType}`;

    const ownerText = entity?.owner === undefined ? 'as any owners' : `as owner "${entity.owner}"`;

    let message: string;
    let outcome: EcsEvent['outcome'];

    if (error) {
      message = `Failed attempt to ${operation.verbs.present} ${doc} ${ownerText}`;
      outcome = ECS_OUTCOMES.failure;
    } else if (isWriteOperation(operation)) {
      message = `User is ${operation.verbs.progressive} ${doc} ${ownerText}`;
      outcome = ECS_OUTCOMES.unknown;
    } else {
      message = `User has ${operation.verbs.past} ${doc} ${ownerText}`;
      outcome = ECS_OUTCOMES.success;
    }

    return {
      message,
      event: {
        action: operation.action,
        category: DATABASE_CATEGORY,
        type: [operation.ecsType],
        outcome,
      },
      ...(entity?.id !== undefined && {
        kibana: {
          saved_object: { type: operation.savedObjectType, id: entity.id },
        },
      }),
      ...(error !== undefined && {
        error: {
          code: error.name,
          message: error.message,
        },
      }),
    };
  }

  /**
   * Creates a message to be passed to an Error or Boom.
   */
  public static createFailureMessage({
    owners,
    operation,
  }: {
    owners: string[];
    operation: OperationDetails | OperationDetails[];
  }) {
    const ownerMsg = owners.length <= 0 ? 'of any owner' : `with owners: "${owners.join(', ')}"`;
    const operations = Array.isArray(operation) ? operation : [operation];
    const operationVerbs = [...new Set(operations.map((op) => op.verbs.present))].join(', ');
    const operationDocTypes = [...new Set(operations.map((op) => op.docType))].join(', ');
    /**
     * This will take the form:
     * `Unauthorized to create case with owners: "securitySolution, observability"`
     * `Unauthorized to access cases of any owner`
     */
    return `Unauthorized to ${operationVerbs} ${operationDocTypes} ${ownerMsg}`;
  }

  /**
   * Logs an audit event based on the status of an operation.
   */
  public log(auditMsgParams: CreateAuditMsgParams) {
    this.auditLogger.log(AuthorizationAuditLogger.createAuditMsg(auditMsgParams));
  }
}
