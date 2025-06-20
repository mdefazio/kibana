/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateGaps } from './update_gaps';
import { findGapsSearchAfter } from '../find_gaps';
import { mgetGaps } from '../mget_gaps';
import { updateGapFromSchedule } from './update_gap_from_schedule';
import { calculateGapStateFromAllBackfills } from './calculate_gaps_state';
import { backfillClientMock } from '../../../backfill_client/backfill_client.mock';

import { loggerMock } from '@kbn/logging-mocks';
import { eventLoggerMock } from '@kbn/event-log-plugin/server/event_logger.mock';
import { eventLogClientMock } from '@kbn/event-log-plugin/server/event_log_client.mock';
import { savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { Gap } from '../gap';
import { adHocRunStatus } from '../../../../common/constants';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';

jest.mock('../find_gaps');
jest.mock('../mget_gaps');
jest.mock('./update_gap_from_schedule');
jest.mock('./calculate_gaps_state');

describe('updateGaps', () => {
  const mockLogger = loggerMock.create();
  const mockEventLogger = eventLoggerMock.create();
  const mockEventLogClient = eventLogClientMock.create();
  const mockSavedObjectsRepository = savedObjectsRepositoryMock.create();
  const mockBackfillClient = backfillClientMock.create();
  const mockActionsClient = actionsClientMock.create();

  const createTestGap = () =>
    new Gap({
      range: {
        gte: '2024-01-01T00:00:00.000Z',
        lte: '2024-01-01T01:00:00.000Z',
      },
      internalFields: {
        _id: 'test-id',
        _index: 'test-index',
        _seq_no: 1,
        _primary_term: 1,
      },
    });

  beforeEach(() => {
    jest.resetAllMocks();
    (findGapsSearchAfter as jest.Mock).mockResolvedValue({
      data: [],
      total: 0,
      pitId: 'test-pit-id',
      searchAfter: undefined,
    });
    (mgetGaps as jest.Mock).mockResolvedValue([]);
  });

  describe('updateGaps', () => {
    it('should orchestrate the gap update process', async () => {
      const testGap = createTestGap();
      (findGapsSearchAfter as jest.Mock).mockResolvedValue({
        data: [testGap],
        pitId: 'test-pit-id',
        searchAfter: undefined,
      });

      await updateGaps({
        ruleId: 'test-rule-id',
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T01:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        backfillClient: mockBackfillClient,
        actionsClient: mockActionsClient,
      });

      expect(findGapsSearchAfter).toHaveBeenCalledWith({
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        params: {
          ruleId: 'test-rule-id',
          start: '2024-01-01T00:00:00.000Z',
          end: '2024-01-01T01:00:00.000Z',
          perPage: 1000,
          statuses: ['partially_filled', 'unfilled'],
          sortField: '@timestamp',
          sortOrder: 'asc',
          searchAfter: undefined,
          pitId: undefined,
        },
      });
      expect(mockEventLogger.updateEvents).toHaveBeenCalled();
      expect(mockEventLogClient.closePointInTime).toHaveBeenCalledWith('test-pit-id');
    });

    it('should handle pagination with search_after', async () => {
      const gaps = [
        createTestGap(),
        new Gap({
          range: {
            gte: '2024-01-01T01:00:00.000Z',
            lte: '2024-01-01T02:00:00.000Z',
          },
          internalFields: {
            _id: 'test-id-2',
            _index: 'test-index',
            _seq_no: 2,
            _primary_term: 1,
          },
        }),
      ];

      // Mock first page with search_after
      const firstPageGaps = Array(500).fill(gaps[0]);
      const secondPageGaps = [gaps[1]];

      (findGapsSearchAfter as jest.Mock)
        .mockResolvedValueOnce({
          data: firstPageGaps,
          pitId: 'test-pit-id',
          searchAfter: ['2024-01-01T01:00:00.000Z'],
        })
        .mockResolvedValueOnce({
          data: secondPageGaps,
          pitId: 'test-pit-id',
          searchAfter: undefined,
        });

      await updateGaps({
        ruleId: 'test-rule-id',
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T02:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        backfillClient: mockBackfillClient,
        actionsClient: mockActionsClient,
      });

      expect(findGapsSearchAfter).toHaveBeenCalledTimes(2);
      expect(findGapsSearchAfter).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          params: expect.objectContaining({
            searchAfter: undefined,
            pitId: undefined,
          }),
        })
      );
      expect(findGapsSearchAfter).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          params: expect.objectContaining({
            searchAfter: ['2024-01-01T01:00:00.000Z'],
            pitId: 'test-pit-id',
          }),
        })
      );
      expect(mockEventLogger.updateEvents).toHaveBeenCalledTimes(2);
      expect(mockEventLogClient.closePointInTime).toHaveBeenCalledWith('test-pit-id');
    });
  });

  describe('error handling', () => {
    it('should handle findGaps errors', async () => {
      (findGapsSearchAfter as jest.Mock).mockRejectedValue(new Error('Find gaps failed'));

      await updateGaps({
        ruleId: 'test-rule-id',
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T01:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        backfillClient: mockBackfillClient,
        actionsClient: mockActionsClient,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update gaps for rule test-rule-id')
      );
    });

    it('should retry on conflict errors and refetch gap', async () => {
      const testGap = createTestGap();
      const updatedGap = createTestGap();
      (findGapsSearchAfter as jest.Mock).mockResolvedValue({
        data: [testGap],
        total: 1,
        pitId: 'test-pit-id',
        searchAfter: undefined,
      });
      (mgetGaps as jest.Mock).mockResolvedValue([updatedGap]);

      if (!testGap.internalFields?._id) {
        throw new Error('Test gap should have internalFields._id');
      }

      mockEventLogger.updateEvents
        .mockResolvedValueOnce({
          errors: true,
          took: 1,
          items: [
            { update: { status: 409, _id: testGap.internalFields._id, _index: 'event-index' } },
          ],
        })
        .mockResolvedValue({ errors: false, took: 1, items: [] });

      await updateGaps({
        ruleId: 'test-rule-id',
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T01:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        backfillClient: mockBackfillClient,
        actionsClient: mockActionsClient,
      });

      expect(mgetGaps).toHaveBeenCalledWith({
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        params: {
          docs: [
            {
              _id: testGap.internalFields._id,
              _index: 'event-index',
            },
          ],
        },
      });
      expect(mockEventLogger.updateEvents).toHaveBeenCalledTimes(2);
    });

    it('should stop retrying after max attempts', async () => {
      const testGap = createTestGap();
      const updatedGap = createTestGap();
      (findGapsSearchAfter as jest.Mock).mockResolvedValue({
        data: [testGap],
        total: 1,
        pitId: 'test-pit-id',
        searchAfter: undefined,
      });
      (mgetGaps as jest.Mock).mockResolvedValue([updatedGap]);

      if (!testGap.internalFields?._id) {
        throw new Error('Test gap should have internalFields._id');
      }

      // Mock updateGaps to fail with conflict error 3 times
      mockEventLogger.updateEvents.mockResolvedValue({
        errors: true,
        took: 1,
        items: [
          { update: { status: 409, _id: testGap.internalFields._id, _index: 'event-index' } },
        ],
      });

      await updateGaps({
        ruleId: 'test-rule-id',
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T01:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        backfillClient: mockBackfillClient,
        actionsClient: mockActionsClient,
      });

      expect(mgetGaps).toHaveBeenCalledTimes(3);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update 1 gaps after 3 retries due to conflicts')
      );
    }, 40000);
  });

  describe('backfill handling', () => {
    beforeEach(() => {
      (updateGapFromSchedule as jest.Mock).mockImplementation((params) => params.gap);
      (calculateGapStateFromAllBackfills as jest.Mock).mockImplementation((params) => params.gap);
    });

    it('should handle direct schedule updates', async () => {
      const testGap = createTestGap();
      (findGapsSearchAfter as jest.Mock).mockResolvedValue({
        data: [testGap],
        total: 1,
        pitId: 'test-pit-id',
        searchAfter: undefined,
      });

      await updateGaps({
        ruleId: 'test-rule-id',
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T01:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        backfillSchedule: [
          {
            runAt: '2024-01-01T00:30:00.000Z',
            interval: '30m',
            status: adHocRunStatus.COMPLETE,
          },
        ],
        backfillClient: mockBackfillClient,
        actionsClient: mockActionsClient,
      });

      expect(updateGapFromSchedule).toHaveBeenCalledWith({
        gap: testGap,
        scheduledItems: [
          {
            from: new Date('2024-01-01T00:00:00.000Z'),
            to: new Date('2024-01-01T00:30:00.000Z'),
            status: adHocRunStatus.COMPLETE,
          },
        ],
      });
      expect(calculateGapStateFromAllBackfills).not.toHaveBeenCalled();
    });

    it('should handle invalid scheduled items', async () => {
      const testGap = createTestGap();
      (findGapsSearchAfter as jest.Mock).mockResolvedValue({
        data: [testGap],
        total: 1,
        pitId: 'test-pit-id',
        searchAfter: undefined,
      });

      await updateGaps({
        ruleId: 'test-rule-id',
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T01:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        backfillSchedule: [
          {
            runAt: '2024-01-01T00:30:00.000Z',
            interval: '30m',
            status: adHocRunStatus.COMPLETE,
          },
          {
            runAt: '2024-01-01T00:35:00.000Z',
            interval: 'INVALID',
            status: adHocRunStatus.COMPLETE,
          },
          {
            runAt: '2024-01-01T00:40:00.000Z',
            interval: '10m',
            status: adHocRunStatus.COMPLETE,
          },
        ],
        backfillClient: mockBackfillClient,
        actionsClient: mockActionsClient,
      });

      expect(updateGapFromSchedule).toHaveBeenCalledWith({
        gap: testGap,
        scheduledItems: [
          {
            from: new Date('2024-01-01T00:00:00.000Z'),
            to: new Date('2024-01-01T00:30:00.000Z'),
            status: adHocRunStatus.COMPLETE,
          },
          {
            from: new Date('2024-01-01T00:30:00.000Z'),
            to: new Date('2024-01-01T00:40:00.000Z'),
            status: adHocRunStatus.COMPLETE,
          },
        ],
      });
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error processing a scheduled item while updating gaps: Invalid duration "INVALID". Durations must be of the form {number}x. Example: 5s, 5m, 5h or 5d"'
      );
      expect(calculateGapStateFromAllBackfills).not.toHaveBeenCalled();
    });

    it('should trigger refetch when shouldRefetchAllBackfills is true', async () => {
      const testGap = createTestGap();
      (findGapsSearchAfter as jest.Mock).mockResolvedValue({
        data: [testGap],
        total: 1,
        pitId: 'test-pit-id',
        searchAfter: undefined,
      });

      await updateGaps({
        ruleId: 'test-rule-id',
        start: new Date('2024-01-01T00:00:00.000Z'),
        end: new Date('2024-01-01T01:00:00.000Z'),
        eventLogger: mockEventLogger,
        eventLogClient: mockEventLogClient,
        logger: mockLogger,
        savedObjectsRepository: mockSavedObjectsRepository,
        shouldRefetchAllBackfills: true,
        backfillClient: mockBackfillClient,
        actionsClient: mockActionsClient,
      });

      expect(updateGapFromSchedule).not.toHaveBeenCalled();
      expect(calculateGapStateFromAllBackfills).toHaveBeenCalled();
    });
  });
});
