import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { MerchantsService } from './merchants.service';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { AuditLogService } from '../../infrastructure/supabase/audit-log.service';
import { mockQueryResult } from '../../test-utils/mock-supabase-query';
import { CreateMerchantDto } from './dto/create-merchant.dto';

describe('MerchantsService', () => {
  let service: MerchantsService;
  let fromMock: jest.Mock;
  let auditLogMock: jest.Mock;

  beforeEach(async () => {
    fromMock = jest.fn();
    auditLogMock = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantsService,
        { provide: SupabaseService, useValue: { client: { from: fromMock } } },
        { provide: AuditLogService, useValue: { log: auditLogMock } },
      ],
    }).compile();

    service = module.get<MerchantsService>(MerchantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('crea el negocio cuando el dueño no tiene uno todavía', async () => {
      const dto: CreateMerchantDto = {
        name: 'Taquería Don Juan',
        industry: 'restaurant',
        contact_email: 'contacto@donjuan.com',
      };
      fromMock.mockReturnValueOnce(
        mockQueryResult({ data: { id: 'business-1', ...dto }, error: null }),
      );

      const result = await service.create('owner-1', dto);

      expect(result).toEqual({ id: 'business-1', ...dto });
    });

    it('lanza ConflictException si el dueño ya tiene un negocio (23505)', async () => {
      fromMock.mockReturnValueOnce(
        mockQueryResult({
          data: null,
          error: { code: '23505', message: 'duplicate key' },
        }),
      );

      await expect(
        service.create('owner-1', {
          name: 'Otro Negocio',
          industry: 'retail',
          contact_email: 'otro@negocio.com',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getMyBusiness', () => {
    it('regresa el negocio del dueño', async () => {
      fromMock.mockReturnValueOnce(
        mockQueryResult({
          data: { id: 'business-1', name: 'Mi Negocio' },
          error: null,
        }),
      );

      const result = await service.getMyBusiness('owner-1');

      expect(result).toEqual({ id: 'business-1', name: 'Mi Negocio' });
    });

    it('lanza NotFoundException si no tiene negocio (PGRST116)', async () => {
      fromMock.mockReturnValueOnce(
        mockQueryResult({
          data: null,
          error: { code: 'PGRST116', message: 'no rows' },
        }),
      );

      await expect(service.getMyBusiness('owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateMyBusiness', () => {
    it('actualiza el negocio y audita el cambio cuando se pasa auditContext', async () => {
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'business-1', anti_fraud_mode: 'none' },
            error: null,
          }),
        ) // lectura del valor viejo para el audit log
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'business-1', anti_fraud_mode: 'ip_only' },
            error: null,
          }),
        ); // update

      const result = await service.updateMyBusiness(
        'owner-1',
        { anti_fraud_mode: 'ip_only' },
        { action: 'business_security_mode_updated', ip: '1.2.3.4' },
      );

      expect(result).toEqual({ id: 'business-1', anti_fraud_mode: 'ip_only' });
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'owner-1',
          action: 'business_security_mode_updated',
          oldValue: { id: 'business-1', anti_fraud_mode: 'none' },
          newValue: { id: 'business-1', anti_fraud_mode: 'ip_only' },
        }),
      );
    });

    it('no audita nada si no se pasa auditContext', async () => {
      fromMock.mockReturnValueOnce(
        mockQueryResult({
          data: { id: 'business-1', name: 'Nuevo Nombre' },
          error: null,
        }),
      );

      await service.updateMyBusiness('owner-1', { name: 'Nuevo Nombre' });

      expect(auditLogMock).not.toHaveBeenCalled();
      // Sin auditContext solo debió hacer 1 llamada a .from() (el update), no la lectura previa
      expect(fromMock).toHaveBeenCalledTimes(1);
    });

    it('lanza NotFoundException si el negocio no existe (o está eliminado)', async () => {
      fromMock.mockReturnValueOnce(
        mockQueryResult({ data: null, error: null }),
      );

      await expect(
        service.updateMyBusiness('owner-1', { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
