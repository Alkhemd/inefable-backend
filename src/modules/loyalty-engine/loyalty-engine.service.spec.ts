import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LoyaltyEngineService } from './loyalty-engine.service';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { AuditLogService } from '../../infrastructure/supabase/audit-log.service';
import { mockQueryResult } from '../../test-utils/mock-supabase-query';

describe('LoyaltyEngineService', () => {
  let service: LoyaltyEngineService;
  let fromMock: jest.Mock;
  let auditLogMock: jest.Mock;

  beforeEach(async () => {
    fromMock = jest.fn();
    auditLogMock = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoyaltyEngineService,
        { provide: SupabaseService, useValue: { client: { from: fromMock } } },
        { provide: AuditLogService, useValue: { log: auditLogMock } },
      ],
    }).compile();

    service = module.get<LoyaltyEngineService>(LoyaltyEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getLoyaltyConfig', () => {
    it('regresa el programa y el negocio', async () => {
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'business-1', name: 'Mi Negocio' } }),
        )
        .mockReturnValueOnce(mockQueryResult({ data: { stamp_goal: 10 } }));

      const result = await service.getLoyaltyConfig('owner-1');

      expect(result).toEqual({
        program: { stamp_goal: 10 },
        business: { id: 'business-1', name: 'Mi Negocio' },
      });
    });

    it('lanza NotFoundException si el negocio no existe o está eliminado', async () => {
      fromMock.mockReturnValueOnce(mockQueryResult({ data: null }));

      await expect(service.getLoyaltyConfig('owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('upsertLoyaltyConfig', () => {
    it('crea el programa y audita loyalty_config_created', async () => {
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'business-1' }, error: null }),
        ) // business
        .mockReturnValueOnce(mockQueryResult({ data: null })) // existingProgram
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'program-1', stamp_goal: 10 },
            error: null,
          }),
        ); // insert

      const result = await service.upsertLoyaltyConfig('owner-1', {
        stamp_goal: 10,
        reward_description: 'Café gratis',
      });

      expect(result).toEqual({ id: 'program-1', stamp_goal: 10 });
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'loyalty_config_created' }),
      );
    });

    it('actualiza el programa existente y audita loyalty_config_updated', async () => {
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'business-1' }, error: null }),
        ) // business
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'program-1', stamp_goal: 5 } }),
        ) // existingProgram
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'program-1', stamp_goal: 10 },
            error: null,
          }),
        ); // update

      const result = await service.upsertLoyaltyConfig('owner-1', {
        stamp_goal: 10,
        reward_description: 'Café gratis',
      });

      expect(result).toEqual({ id: 'program-1', stamp_goal: 10 });
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'loyalty_config_updated',
          oldValue: { id: 'program-1', stamp_goal: 5 },
        }),
      );
    });

    it('lanza NotFoundException si el negocio no existe o está eliminado', async () => {
      fromMock.mockReturnValueOnce(
        mockQueryResult({ data: null, error: null }),
      );

      await expect(
        service.upsertLoyaltyConfig('owner-1', {
          stamp_goal: 10,
          reward_description: 'Café gratis',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
