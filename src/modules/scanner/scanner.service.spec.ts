import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { WalletPassesService } from '../wallet-passes/wallet-passes.service';
import { AuditLogService } from '../../infrastructure/supabase/audit-log.service';
import type { CashierJwtPayload } from '../../core/guards/cashier-auth.guard';
import { mockQueryResult } from '../../test-utils/mock-supabase-query';

describe('ScannerService', () => {
  let service: ScannerService;
  let fromMock: jest.Mock;
  let updatePassObjectMock: jest.Mock;
  let auditLogMock: jest.Mock;

  const cashierPayload: CashierJwtPayload = {
    sub: 'employee-1',
    type: 'cashier',
    businessId: 'business-1',
    name: 'Empleado de prueba',
  };

  beforeEach(async () => {
    fromMock = jest.fn();
    updatePassObjectMock = jest.fn().mockResolvedValue(undefined);
    auditLogMock = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScannerService,
        { provide: SupabaseService, useValue: { client: { from: fromMock } } },
        {
          provide: WalletPassesService,
          useValue: { updatePassObject: updatePassObjectMock },
        },
        { provide: AuditLogService, useValue: { log: auditLogMock } },
      ],
    }).compile();

    service = module.get<ScannerService>(ScannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addStamp', () => {
    it('otorga el sello cuando no hay antifraude configurado (mode: none)', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } })) // assertBusinessActive
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'installation-1' }, error: null }),
        ) // pass_installations
        .mockReturnValueOnce(
          mockQueryResult({
            data: {
              anti_fraud_mode: 'none',
              authorized_ip: null,
              lat: null,
              lng: null,
              radius_meters: 50,
            },
          }),
        ) // businesses
        .mockReturnValueOnce(mockQueryResult({ data: { stamp_goal: 10 } })) // loyalty_programs
        .mockReturnValueOnce(mockQueryResult({ count: 3 })) // stamp_transactions count
        .mockReturnValueOnce(mockQueryResult({ count: 0 })) // redemptions count
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'stamp-1', created_at: '2026-07-29T00:00:00Z' },
            error: null,
          }),
        ); // insert stamp_transactions

      const result = await service.addStamp(
        cashierPayload,
        'installation-1',
        '1.2.3.4',
        'jest-agent',
      );

      expect(result.currentActiveStamps).toBe(4);
      expect(result.requiredStamps).toBe(10);
      expect(result.prizeUnlocked).toBe(false);
      expect(updatePassObjectMock).toHaveBeenCalledWith(
        'installation-1',
        4,
        10,
      );
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'stamp_granted',
          actorId: 'employee-1',
        }),
      );
    });

    it('rechaza el sello cuando el modo ip_only no coincide con la IP del cajero', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } })) // assertBusinessActive
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'installation-1' }, error: null }),
        ) // pass_installations
        .mockReturnValueOnce(
          mockQueryResult({
            data: {
              anti_fraud_mode: 'ip_only',
              authorized_ip: '9.9.9.9',
              lat: null,
              lng: null,
              radius_meters: 50,
            },
          }),
        ); // businesses

      await expect(
        service.addStamp(
          cashierPayload,
          'installation-1',
          '1.2.3.4',
          'jest-agent',
        ),
      ).rejects.toThrow(ForbiddenException);

      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'stamp_rejected_antifraud',
          actorId: 'employee-1',
        }),
      );
      // No debió llegar a contar sellos ni insertar nada: solo 3 llamadas a .from()
      expect(fromMock).toHaveBeenCalledTimes(3);
    });

    it('rechaza el sello en modo gps_only con mensaje de "sin ubicación" si el cajero no mandó coordenadas', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } })) // assertBusinessActive
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'installation-1' }, error: null }),
        ) // pass_installations
        .mockReturnValueOnce(
          mockQueryResult({
            data: {
              anti_fraud_mode: 'gps_only',
              authorized_ip: null,
              lat: 19.4326,
              lng: -99.1332,
              radius_meters: 50,
            },
          }),
        ); // businesses

      // No se pasan lat/lng (permiso de ubicación denegado en el celular del cajero)
      await expect(
        service.addStamp(
          cashierPayload,
          'installation-1',
          '1.2.3.4',
          'jest-agent',
        ),
      ).rejects.toThrow('No pudimos obtener tu ubicación');
    });

    it('rechaza el sello en modo gps_only con la distancia real si el cajero sí mandó coordenadas pero está lejos', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } })) // assertBusinessActive
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'installation-1' }, error: null }),
        ) // pass_installations
        .mockReturnValueOnce(
          mockQueryResult({
            data: {
              anti_fraud_mode: 'gps_only',
              authorized_ip: null,
              lat: 19.4326,
              lng: -99.1332,
              radius_meters: 50,
            },
          }),
        ); // businesses

      // Coordenadas muy lejos del negocio (Guadalajara vs CDMX)
      await expect(
        service.addStamp(
          cashierPayload,
          'installation-1',
          '1.2.3.4',
          'jest-agent',
          20.6597,
          -103.3496,
        ),
      ).rejects.toThrow('Estás demasiado lejos del local');
    });

    it('lanza NotFoundException si la instalación no existe para ese negocio', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } })) // assertBusinessActive
        .mockReturnValueOnce(
          mockQueryResult({ data: null, error: { message: 'not found' } }),
        );

      await expect(
        service.addStamp(
          cashierPayload,
          'installation-x',
          '1.2.3.4',
          'jest-agent',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('redeemPrize', () => {
    it('canjea el premio cuando el cliente alcanzó la meta de sellos', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } })) // assertBusinessActive
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'installation-1' }, error: null }),
        ) // pass_installations
        .mockReturnValueOnce(mockQueryResult({ data: { stamp_goal: 10 } })) // loyalty_programs
        .mockReturnValueOnce(mockQueryResult({ count: 10 })) // stamp_transactions count
        .mockReturnValueOnce(mockQueryResult({ count: 0 })) // redemptions count
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'redemption-1', redeemed_at: '2026-07-29T00:00:00Z' },
            error: null,
          }),
        ); // insert redemptions

      const result = await service.redeemPrize(
        cashierPayload,
        'installation-1',
        '1.2.3.4',
        'jest-agent',
      );

      expect(result.remainingStamps).toBe(0);
      expect(result.requiredStamps).toBe(10);
      expect(updatePassObjectMock).toHaveBeenCalledWith(
        'installation-1',
        0,
        10,
      );
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'prize_redeemed',
          actorId: 'employee-1',
        }),
      );
    });

    it('rechaza el canje si al cliente le faltan sellos', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } })) // assertBusinessActive
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'installation-1' }, error: null }),
        ) // pass_installations
        .mockReturnValueOnce(mockQueryResult({ data: { stamp_goal: 10 } })) // loyalty_programs
        .mockReturnValueOnce(mockQueryResult({ count: 4 })) // stamp_transactions count
        .mockReturnValueOnce(mockQueryResult({ count: 0 })); // redemptions count

      await expect(
        service.redeemPrize(
          cashierPayload,
          'installation-1',
          '1.2.3.4',
          'jest-agent',
        ),
      ).rejects.toThrow(ForbiddenException);

      // No debió intentar insertar el canje: solo las 5 llamadas de lectura anteriores
      expect(fromMock).toHaveBeenCalledTimes(5);
      expect(updatePassObjectMock).not.toHaveBeenCalled();
    });
  });
});
