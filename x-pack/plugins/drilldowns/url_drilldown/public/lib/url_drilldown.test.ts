/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UrlDrilldown, ActionContext, Config } from './url_drilldown';
import { IEmbeddable } from '../../../../../../src/plugins/embeddable/public/lib/embeddables';
import { DatatableColumnType } from '../../../../../../src/plugins/expressions/common';
import { createPoint, rowClickData, TestEmbeddable } from './test/data';
import {
  VALUE_CLICK_TRIGGER,
  ROW_CLICK_TRIGGER,
} from '../../../../../../src/plugins/ui_actions/public';

const mockDataPoints = [
  {
    table: {
      columns: [
        {
          name: 'test',
          id: '1-1',
          meta: {
            type: 'number' as DatatableColumnType,
            field: 'bytes',
            index: 'logstash-*',
            sourceParams: {
              indexPatternId: 'logstash-*',
              type: 'histogram',
              params: {
                field: 'bytes',
                interval: 30,
                otherBucket: true,
              },
            },
          },
        },
      ],
      rows: [
        {
          '1-1': '2048',
        },
      ],
    },
    column: 0,
    row: 0,
    value: 'test',
  },
];

const mockEmbeddable = ({
  getInput: () => ({
    filters: [],
    timeRange: { from: 'now-15m', to: 'now' },
    query: { query: 'test', language: 'kuery' },
  }),
  getOutput: () => ({}),
} as unknown) as IEmbeddable;

const mockNavigateToUrl = jest.fn(() => Promise.resolve());

describe('UrlDrilldown', () => {
  const urlDrilldown = new UrlDrilldown({
    getGlobalScope: () => ({ kibanaUrl: 'http://localhost:5601/' }),
    getSyntaxHelpDocsLink: () => 'http://localhost:5601/docs',
    getVariablesHelpDocsLink: () => 'http://localhost:5601/docs',
    navigateToUrl: mockNavigateToUrl,
  });

  test('license', () => {
    expect(urlDrilldown.minimalLicense).toBe('gold');
  });

  describe('isCompatible', () => {
    test('throws if no embeddable', async () => {
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}`,
        },
        openInNewTab: false,
      };

      const context: ActionContext = {
        data: {
          data: mockDataPoints,
        },
      };

      await expect(urlDrilldown.isCompatible(config, context)).rejects.toThrowError();
    });

    test('compatible if url is valid', async () => {
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.query}}`,
        },
        openInNewTab: false,
      };

      const context: ActionContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddable,
      };

      const result = urlDrilldown.isCompatible(config, context);
      await expect(result).resolves.toBe(true);
    });

    test('not compatible if url is invalid', async () => {
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.somethingFake}}`,
        },
        openInNewTab: false,
      };

      const context: ActionContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddable,
      };

      await expect(urlDrilldown.isCompatible(config, context)).resolves.toBe(false);
    });
  });

  describe('getHref & execute', () => {
    beforeEach(() => {
      mockNavigateToUrl.mockReset();
    });

    test('valid url', async () => {
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.query}}`,
        },
        openInNewTab: false,
      };

      const context: ActionContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddable,
      };

      const url = await urlDrilldown.getHref(config, context);
      expect(url).toMatchInlineSnapshot(`"https://elasti.co/?test&(language:kuery,query:test)"`);

      await urlDrilldown.execute(config, context);
      expect(mockNavigateToUrl).toBeCalledWith(url);
    });

    test('invalid url', async () => {
      const config: Config = {
        url: {
          template: `https://elasti.co/?{{event.value}}&{{rison context.panel.invalid}}`,
        },
        openInNewTab: false,
      };

      const context: ActionContext = {
        data: {
          data: mockDataPoints,
        },
        embeddable: mockEmbeddable,
      };

      await expect(urlDrilldown.getHref(config, context)).rejects.toThrowError();
      await expect(urlDrilldown.execute(config, context)).rejects.toThrowError();
      expect(mockNavigateToUrl).not.toBeCalled();
    });
  });

  describe('variables', () => {
    const embeddable1 = new TestEmbeddable(
      {
        id: 'test',
        title: 'The Title',
        savedObjectId: 'SAVED_OBJECT_IDxx',
      },
      {
        indexPatterns: [{ id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' }],
      }
    );
    const data: any = {
      data: [
        createPoint({ field: 'field0', value: 'value0' }),
        createPoint({ field: 'field1', value: 'value1' }),
        createPoint({ field: 'field2', value: 'value2' }),
      ],
    };

    const embeddable2 = new TestEmbeddable(
      {
        id: 'the-id',
        query: {
          language: 'C++',
          query: 'std::cout << 123;',
        },
        timeRange: {
          from: 'FROM',
          to: 'TO',
        },
        filters: [
          {
            meta: {
              alias: 'asdf',
              disabled: false,
              negate: false,
            },
          },
        ],
        savedObjectId: 'SAVED_OBJECT_ID',
      },
      {
        title: 'The Title',
        indexPatterns: [
          { id: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' },
          { id: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy' },
        ],
      }
    );

    describe('getRuntimeVariables()', () => {
      test('builds runtime variables for VALUE_CLICK_TRIGGER trigger', () => {
        const variables = urlDrilldown.getRuntimeVariables({
          embeddable: embeddable1,
          data,
        });

        expect(variables).toMatchObject({
          kibanaUrl: 'http://localhost:5601/',
          context: {
            panel: {
              id: 'test',
              title: 'The Title',
              savedObjectId: 'SAVED_OBJECT_IDxx',
              indexPatternId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
            },
          },
          event: {
            key: 'field0',
            value: 'value0',
            negate: false,
            points: [
              {
                value: 'value0',
                key: 'field0',
              },
              {
                value: 'value1',
                key: 'field1',
              },
              {
                value: 'value2',
                key: 'field2',
              },
            ],
          },
        });
      });

      test('builds runtime variables for ROW_CLICK_TRIGGER trigger', () => {
        const variables = urlDrilldown.getRuntimeVariables({
          embeddable: embeddable2,
          data: rowClickData as any,
        });

        expect(variables).toMatchObject({
          kibanaUrl: 'http://localhost:5601/',
          context: {
            panel: {
              id: 'the-id',
              title: 'The Title',
              savedObjectId: 'SAVED_OBJECT_ID',
              query: {
                language: 'C++',
                query: 'std::cout << 123;',
              },
              timeRange: {
                from: 'FROM',
                to: 'TO',
              },
              filters: [
                {
                  meta: {
                    alias: 'asdf',
                    disabled: false,
                    negate: false,
                  },
                },
              ],
            },
          },
          event: {
            rowIndex: 1,
            values: ['IT', '2.25', 3, 0, 2],
            keys: ['DestCountry', 'FlightTimeHour', '', 'DistanceMiles', 'OriginAirportID'],
            columnNames: [
              'Top values of DestCountry',
              'Top values of FlightTimeHour',
              'Count of records',
              'Average of DistanceMiles',
              'Unique count of OriginAirportID',
            ],
          },
        });
      });
    });

    describe('getVariableList()', () => {
      test('builds variable list for VALUE_CLICK_TRIGGER trigger', () => {
        const list = urlDrilldown.getVariableList({
          triggers: [VALUE_CLICK_TRIGGER],
          embeddable: embeddable1,
        });

        const expectedList = [
          'event.key',
          'event.value',
          'event.negate',
          'event.points',

          'context.panel.id',
          'context.panel.title',
          'context.panel.indexPatternId',
          'context.panel.savedObjectId',

          'kibanaUrl',
        ];

        for (const expectedItem of expectedList) {
          expect(list.includes(expectedItem)).toBe(true);
        }
      });

      test('builds variable list for ROW_CLICK_TRIGGER trigger', () => {
        const list = urlDrilldown.getVariableList({
          triggers: [ROW_CLICK_TRIGGER],
          embeddable: embeddable2,
        });

        const expectedList = [
          'event.columnNames',
          'event.keys',
          'event.rowIndex',
          'event.values',

          'context.panel.id',
          'context.panel.title',
          'context.panel.filters',
          'context.panel.query.language',
          'context.panel.query.query',
          'context.panel.indexPatternIds',
          'context.panel.savedObjectId',
          'context.panel.timeRange.from',
          'context.panel.timeRange.to',

          'kibanaUrl',
        ];

        for (const expectedItem of expectedList) {
          expect(list.includes(expectedItem)).toBe(true);
        }
      });
    });
  });
});
