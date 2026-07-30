import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { mockQueryResult } from '../../test-utils/mock-supabase-query';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let fromMock: jest.Mock;

  beforeEach(async () => {
    fromMock = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: SupabaseService, useValue: { client: { from: fromMock } } },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getKPIs', () => {
    it('regresa los KPIs sumados del negocio', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } })) // getBusinessId
        .mockReturnValueOnce(
          mockQueryResult({ data: [{ id: 'pass-1' }, { id: 'pass-2' }] }),
        ) // passes
        .mockReturnValueOnce(mockQueryResult({ count: 5 })) // pass_installations
        .mockReturnValueOnce(
          mockQueryResult({ data: [{ stamp_count: 1 }, { stamp_count: 3 }] }),
        ) // stamp_transactions
        .mockReturnValueOnce(mockQueryResult({ count: 2 })); // redemptions

      const result = await service.getKPIs('owner-1');

      expect(result).toEqual({
        activePasses: 5,
        totalStamps: 4,
        totalRedemptions: 2,
      });
    });

    it('lanza NotFoundException si el dueño no tiene negocio activo', async () => {
      fromMock.mockReturnValueOnce(mockQueryResult({ data: null }));

      await expect(service.getKPIs('owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getEmployeeRanking', () => {
    it('regresa el ranking ordenado de mayor a menor', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } })) // getBusinessId
        .mockReturnValueOnce(
          mockQueryResult({
            data: [
              { id: 'emp-1', name: 'Emiliano' },
              { id: 'emp-2', name: 'Ana' },
            ],
          }),
        ) // employees
        .mockReturnValueOnce(
          mockQueryResult({
            data: [
              { employee_id: 'emp-1', stamp_count: 1 },
              { employee_id: 'emp-2', stamp_count: 5 },
              { employee_id: 'emp-2', stamp_count: 2 },
            ],
          }),
        ); // stamp_transactions

      const result = await service.getEmployeeRanking('owner-1');

      expect(result).toEqual([
        { name: 'Ana', totalStamps: 7 },
        { name: 'Emiliano', totalStamps: 1 },
      ]);
    });
  });

  describe('getRecentActivity', () => {
    it('regresa la actividad reciente', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } })) // getBusinessId
        .mockReturnValueOnce(
          mockQueryResult({
            data: [{ id: 'stamp-1', stamp_count: 1, created_at: 'now' }],
            error: null,
          }),
        );

      const result = await service.getRecentActivity('owner-1');

      expect(result).toEqual([
        { id: 'stamp-1', stamp_count: 1, created_at: 'now' },
      ]);
    });

    it('lanza InternalServerErrorException si Supabase regresa error', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } }))
        .mockReturnValueOnce(
          mockQueryResult({ data: null, error: { message: 'boom' } }),
        );

      await expect(service.getRecentActivity('owner-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
