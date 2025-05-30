/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import { getListClientMock } from '@kbn/lists-plugin/server/services/lists/list_client.mock';
import { buildExceptionFilter } from '@kbn/lists-plugin/server/services/exception_lists';
import { buildEqlSearchRequest } from './build_eql_search_request';
import { getEqlRuleParams } from '../../rule_schema/mocks';
import { getSharedParamsMock } from '../__mocks__/shared_params';

const emptyFilter = {
  bool: {
    must: [],
    filter: [],
    should: [],
    must_not: [],
  },
};
const index = ['testindex1', 'testindex2'];
const ruleParams = getEqlRuleParams({ index });
const sharedParams = getSharedParamsMock({
  ruleParams,
  rewrites: { inputIndex: ['testindex1', 'testindex2'] },
});

describe('buildEqlSearchRequest', () => {
  test('should build a basic request with time range', () => {
    const request = buildEqlSearchRequest({
      sharedParams,
      query: 'process where true',
      from: 'now-5m',
      to: 'now',
      size: 100,
      filters: undefined,
      eventCategoryOverride: undefined,
    });
    expect(request).toEqual({
      allow_no_indices: true,
      index: ['testindex1', 'testindex2'],
      size: 100,
      query: 'process where true',
      runtime_mappings: undefined,
      filter: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: 'now-5m',
                  lte: 'now',
                  format: 'strict_date_optional_time',
                },
              },
            },
            emptyFilter,
          ],
        },
      },
      allow_partial_search_results: true,
      fields: [
        {
          field: '*',
          include_unmapped: true,
        },
        {
          field: '@timestamp',
          format: 'strict_date_optional_time',
        },
      ],
    });
  });

  test('should build a request with timestamp and event category overrides', () => {
    const request = buildEqlSearchRequest({
      sharedParams: {
        ...sharedParams,
        primaryTimestamp: 'event.ingested',
        secondaryTimestamp: '@timestamp',
      },
      query: 'process where true',
      from: 'now-5m',
      to: 'now',
      size: 100,
      filters: undefined,
      eventCategoryOverride: 'event.other_category',
      timestampField: undefined,
    });
    expect(request).toEqual({
      allow_no_indices: true,
      index: ['testindex1', 'testindex2'],
      event_category_field: 'event.other_category',
      size: 100,
      query: 'process where true',
      runtime_mappings: undefined,
      filter: {
        bool: {
          filter: [
            {
              bool: {
                minimum_should_match: 1,
                should: [
                  {
                    range: {
                      'event.ingested': {
                        lte: 'now',
                        gte: 'now-5m',
                        format: 'strict_date_optional_time',
                      },
                    },
                  },
                  {
                    bool: {
                      filter: [
                        {
                          range: {
                            '@timestamp': {
                              lte: 'now',
                              gte: 'now-5m',
                              format: 'strict_date_optional_time',
                            },
                          },
                        },
                        {
                          bool: {
                            must_not: {
                              exists: {
                                field: 'event.ingested',
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                ],
              },
            },
            emptyFilter,
          ],
        },
      },
      allow_partial_search_results: true,
      fields: [
        {
          field: '*',
          include_unmapped: true,
        },
        {
          field: 'event.ingested',
          format: 'strict_date_optional_time',
        },
        {
          field: '@timestamp',
          format: 'strict_date_optional_time',
        },
      ],
    });
  });

  test('should build a request without @timestamp fallback if secondaryTimestamp is not specified', () => {
    const request = buildEqlSearchRequest({
      sharedParams: {
        ...sharedParams,
        primaryTimestamp: 'event.ingested',
      },
      query: 'process where true',
      from: 'now-5m',
      to: 'now',
      size: 100,
      filters: undefined,
      eventCategoryOverride: 'event.other_category',
      timestampField: undefined,
    });
    expect(request).toEqual({
      allow_no_indices: true,
      index: ['testindex1', 'testindex2'],
      event_category_field: 'event.other_category',
      size: 100,
      query: 'process where true',
      runtime_mappings: undefined,
      filter: {
        bool: {
          filter: [
            {
              range: {
                'event.ingested': {
                  lte: 'now',
                  gte: 'now-5m',
                  format: 'strict_date_optional_time',
                },
              },
            },
            emptyFilter,
          ],
        },
      },
      allow_partial_search_results: true,
      fields: [
        {
          field: '*',
          include_unmapped: true,
        },
        {
          field: 'event.ingested',
          format: 'strict_date_optional_time',
        },
      ],
    });
  });

  test('should build a request with exceptions', async () => {
    const { filter } = await buildExceptionFilter({
      listClient: getListClientMock(),
      lists: [getExceptionListItemSchemaMock()],
      alias: null,
      chunkSize: 1024,
      excludeExceptions: true,
      startedAt: new Date(),
    });
    const request = buildEqlSearchRequest({
      sharedParams: {
        ...sharedParams,
        exceptionFilter: filter,
      },
      query: 'process where true',
      from: 'now-5m',
      to: 'now',
      size: 100,
      filters: undefined,
      eventCategoryOverride: undefined,
    });
    expect(request).toMatchInlineSnapshot(`
      Object {
        "allow_no_indices": true,
        "allow_partial_search_results": true,
        "event_category_field": undefined,
        "fields": Array [
          Object {
            "field": "*",
            "include_unmapped": true,
          },
          Object {
            "field": "@timestamp",
            "format": "strict_date_optional_time",
          },
        ],
        "filter": Object {
          "bool": Object {
            "filter": Array [
              Object {
                "range": Object {
                  "@timestamp": Object {
                    "format": "strict_date_optional_time",
                    "gte": "now-5m",
                    "lte": "now",
                  },
                },
              },
              Object {
                "bool": Object {
                  "filter": Array [],
                  "must": Array [],
                  "must_not": Array [
                    Object {
                      "bool": Object {
                        "should": Array [
                          Object {
                            "bool": Object {
                              "filter": Array [
                                Object {
                                  "nested": Object {
                                    "path": "some.parentField",
                                    "query": Object {
                                      "bool": Object {
                                        "minimum_should_match": 1,
                                        "should": Array [
                                          Object {
                                            "match_phrase": Object {
                                              "some.parentField.nested.field": "some value",
                                            },
                                          },
                                        ],
                                      },
                                    },
                                    "score_mode": "none",
                                  },
                                },
                                Object {
                                  "bool": Object {
                                    "minimum_should_match": 1,
                                    "should": Array [
                                      Object {
                                        "match_phrase": Object {
                                          "some.not.nested.field": "some value",
                                        },
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                  "should": Array [],
                },
              },
            ],
          },
        },
        "index": Array [
          "testindex1",
          "testindex2",
        ],
        "query": "process where true",
        "runtime_mappings": undefined,
        "size": 100,
        "timestamp_field": undefined,
      }
    `);
  });

  test('should build a request with filters', () => {
    const filters = [
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'exists',
          key: 'process.name',
          value: 'exists',
        },
        query: {
          exists: {
            field: 'process.name',
          },
        },
      },
      {
        meta: {
          alias: null,
          negate: false,
          disabled: false,
          type: 'phrase',
          key: 'host.name',
          params: {
            query: 'Host-b4d9hu1a56',
          },
        },
        query: {
          match_phrase: {
            'host.name': 'Host-b4d9hu1a56',
          },
        },
      },
    ];
    const request = buildEqlSearchRequest({
      sharedParams,
      query: 'process where true',
      from: 'now-5m',
      to: 'now',
      size: 100,
      filters,
    });
    expect(request).toEqual({
      allow_no_indices: true,
      index: ['testindex1', 'testindex2'],
      size: 100,
      query: 'process where true',
      filter: {
        bool: {
          filter: [
            {
              range: {
                '@timestamp': {
                  gte: 'now-5m',
                  lte: 'now',
                  format: 'strict_date_optional_time',
                },
              },
            },
            {
              bool: {
                must: [],
                filter: [
                  {
                    exists: {
                      field: 'process.name',
                    },
                  },
                  {
                    match_phrase: {
                      'host.name': 'Host-b4d9hu1a56',
                    },
                  },
                ],
                should: [],
                must_not: [],
              },
            },
          ],
        },
      },
      allow_partial_search_results: true,
      fields: [
        {
          field: '*',
          include_unmapped: true,
        },
        {
          field: '@timestamp',
          format: 'strict_date_optional_time',
        },
      ],
    });
  });

  describe('handles the tiebreaker field', () => {
    test('should pass a tiebreaker field with a valid value', async () => {
      const request = buildEqlSearchRequest({
        sharedParams,
        query: 'process where true',
        from: 'now-5m',
        to: 'now',
        size: 100,
        filters: undefined,
        tiebreakerField: 'host.name',
        eventCategoryOverride: undefined,
      });
      expect(request?.tiebreaker_field).toEqual(`host.name`);
    });

    test('should not pass a tiebreaker field with an invalid value', async () => {
      const request = buildEqlSearchRequest({
        sharedParams,
        query: 'process where true',
        from: 'now-5m',
        to: 'now',
        size: 100,
        filters: undefined,
        tiebreakerField: '',
        eventCategoryOverride: undefined,
      });
      expect(request?.tiebreaker_field).toEqual(undefined);
    });
  });
});
