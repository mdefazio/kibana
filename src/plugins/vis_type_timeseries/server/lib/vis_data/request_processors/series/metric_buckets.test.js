/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { metricBuckets } from './metric_buckets';

describe('metricBuckets(req, panel, series)', () => {
  let metricBucketsProcessor;

  beforeEach(() => {
    metricBucketsProcessor = metricBuckets(
      {
        payload: {
          timerange: {
            min: '2017-01-01T00:00:00Z',
            max: '2017-01-01T01:00:00Z',
          },
        },
      },
      {
        time_field: 'timestamp',
      },
      {
        id: 'test',
        split_mode: 'terms',
        terms_size: 10,
        terms_field: 'host',
        metrics: [
          {
            id: 'metric-1',
            type: 'max',
            field: 'io',
          },
          {
            id: 'metric-2',
            type: 'derivative',
            field: 'metric-1',
            unit: '1s',
          },
          {
            id: 'metric-3',
            type: 'avg_bucket',
            field: 'metric-2',
          },
        ],
      },
      {},
      {},
      undefined,
      {
        barTargetUiSettings: 50,
      }
    );
  });

  test('calls next when finished', () => {
    const next = jest.fn();
    metricBucketsProcessor(next)({});
    expect(next.mock.calls.length).toEqual(1);
  });

  test('returns metric aggs', () => {
    const next = (doc) => doc;
    const doc = metricBucketsProcessor(next)({});

    expect(doc).toEqual({
      aggs: {
        test: {
          aggs: {
            timeseries: {
              aggs: {
                'metric-1': {
                  max: {
                    field: 'io',
                  },
                },
                'metric-2': {
                  derivative: {
                    buckets_path: 'metric-1',
                    gap_policy: 'skip',
                    unit: '1s',
                  },
                },
              },
            },
          },
        },
      },
    });
  });
});
