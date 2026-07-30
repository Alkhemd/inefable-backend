import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { AuditLogService } from '../../infrastructure/supabase/audit-log.service';
import { mockQueryResult } from '../../test-utils/mock-supabase-query';

describe('AdminService', () => {
  let service: AdminService;
  let fromMock: jest.Mock;
  let auditLogMock: jest.Mock;

  beforeEach(async () => {
    fromMock = jest.fn();
    auditLogMock = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: SupabaseService, useValue: { client: { from: fromMock } } },
        { provide: AuditLogService, useValue: { log: auditLogMock } },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBusinesses', () => {
    it('regresa el listado global sin filtro', async () => {
      fromMock.mockReturnValueOnce(
        mockQueryResult({
          data: [{ id: 'business-1' }, { id: 'business-2' }],
          error: null,
        }),
      );

      const result = await service.getBusinesses();

      expect(result).toEqual([{ id: 'business-1' }, { id: 'business-2' }]);
    });

    it('filtra por status cuando se pasa', async () => {
      fromMock.mockReturnValueOnce(
        mockQueryResult({
          data: [{ id: 'business-1', status: 'trial' }],
          error: null,
        }),
      );

      const result = await service.getBusinesses('trial');

      expect(result).toEqual([{ id: 'business-1', status: 'trial' }]);
    });
  });

  describe('updateBusinessStatus', () => {
    it('actualiza el status y audita business_status_updated', async () => {
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'business-1', status: 'trial' } }),
        ) // oldBusiness
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'business-1', status: 'suspended' },
            error: null,
          }),
        ); // update

      const result = await service.updateBusinessStatus(
        'business-1',
        'suspended',
        'admin-1',
        '1.2.3.4',
        'jest-agent',
      );

      expect(result).toEqual({ id: 'business-1', status: 'suspended' });
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'business_status_updated',
          actorId: 'admin-1',
          oldValue: { id: 'business-1', status: 'trial' },
          newValue: { id: 'business-1', status: 'suspended' },
        }),
      );
    });

    it('lanza NotFoundException si el negocio no existe', async () => {
      fromMock.mockReturnValueOnce(mockQueryResult({ data: null }));

      await expect(
        service.updateBusinessStatus('business-x', 'suspended', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBusiness', () => {
    it('actualiza los datos del negocio y audita business_updated_by_admin', async () => {
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'business-1', name: 'Viejo' } }),
        )
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'business-1', name: 'Nuevo' },
            error: null,
          }),
        );

      const result = await service.updateBusiness(
        'business-1',
        { name: 'Nuevo' },
        'admin-1',
      );

      expect(result).toEqual({ id: 'business-1', name: 'Nuevo' });
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'business_updated_by_admin' }),
      );
    });

    it('lanza NotFoundException si el negocio no existe', async () => {
      fromMock.mockReturnValueOnce(mockQueryResult({ data: null }));

      await expect(
        service.updateBusiness('business-x', { name: 'X' }, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteBusiness', () => {
    it('marca deleted_at y audita business_deleted', async () => {
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'business-1', deleted_at: null } }),
        )
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'business-1', deleted_at: '2026-07-29T00:00:00Z' },
            error: null,
          }),
        );

      const result = await service.deleteBusiness('business-1', 'admin-1');

      expect(result.deleted_at).toBe('2026-07-29T00:00:00Z');
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'business_deleted' }),
      );
    });

    it('lanza NotFoundException si el negocio no existe', async () => {
      fromMock.mockReturnValueOnce(mockQueryResult({ data: null }));

      await expect(
        service.deleteBusiness('business-x', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getGlobalMetrics', () => {
    it('suma las métricas de todos los negocios activos', async () => {
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({
            data: [{ id: 'business-1' }, { id: 'business-2' }],
          }),
        ) // getActiveBusinessIds
        .mockReturnValueOnce(mockQueryResult({ data: [{ id: 'pass-1' }] })) // passes
        .mockReturnValueOnce(mockQueryResult({ count: 4 })) // pass_installations
        .mockReturnValueOnce(
          mockQueryResult({ data: [{ stamp_count: 2 }, { stamp_count: 3 }] }),
        ) // stamp_transactions
        .mockReturnValueOnce(mockQueryResult({ count: 1 })) // redemptions
        .mockReturnValueOnce(mockQueryResult({ count: 6 })); // customers

      const result = await service.getGlobalMetrics();

      expect(result).toEqual({
        totalBusinesses: 2,
        activePasses: 4,
        totalStamps: 5,
        totalRedemptions: 1,
        totalCustomers: 6,
      });
    });
  });

  describe('getCustomers', () => {
    it('regresa los clientes con el nombre del negocio extraído del join', async () => {
      fromMock.mockReturnValueOnce(
        mockQueryResult({
          data: [
            {
              id: 'customer-1',
              first_name: 'Ana',
              last_name: 'Pérez',
              email: 'a@a.com',
              phone_number: null,
              created_at: 'now',
              business_id: 'business-1',
              businesses: { name: 'Taquería Don Juan' },
            },
          ],
          error: null,
        }),
      );

      const result = await service.getCustomers();

      expect(result).toEqual([
        {
          id: 'customer-1',
          first_name: 'Ana',
          last_name: 'Pérez',
          email: 'a@a.com',
          phone_number: null,
          created_at: 'now',
          business_id: 'business-1',
          business_name: 'Taquería Don Juan',
        },
      ]);
    });

    it('filtra por businessId cuando se pasa', async () => {
      fromMock.mockReturnValueOnce(mockQueryResult({ data: [], error: null }));

      const result = await service.getCustomers('business-1');

      expect(result).toEqual([]);
    });
  });
});
