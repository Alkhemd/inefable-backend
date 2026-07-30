import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { WalletPassesService } from './wallet-passes.service';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { AuditLogService } from '../../infrastructure/supabase/audit-log.service';
import { mockQueryResult } from '../../test-utils/mock-supabase-query';

const mockAuthorize = jest.fn().mockResolvedValue({ access_token: 'token' });
const mockRequest = jest.fn().mockResolvedValue({});

jest.mock('google-auth-library', () => ({
  JWT: jest.fn().mockImplementation(() => ({
    email: 'service-account@test.iam.gserviceaccount.com',
    authorize: mockAuthorize,
    request: mockRequest,
  })),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'signed-jwt-token'),
}));

describe('WalletPassesService', () => {
  let service: WalletPassesService;
  let fromMock: jest.Mock;
  let auditLogMock: jest.Mock;

  beforeEach(async () => {
    fromMock = jest.fn();
    auditLogMock = jest.fn().mockResolvedValue(undefined);
    mockRequest.mockClear();

    process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL =
      'service-account@test.iam.gserviceaccount.com';
    process.env.GOOGLE_WALLET_PRIVATE_KEY =
      '-----BEGIN PRIVATE KEY-----\\nFAKE\\n-----END PRIVATE KEY-----\\n';
    process.env.GOOGLE_WALLET_ISSUER_ID = 'issuer-1';
    process.env.GOOGLE_WALLET_CLASS_ID = 'class-1';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletPassesService,
        { provide: SupabaseService, useValue: { client: { from: fromMock } } },
        { provide: AuditLogService, useValue: { log: auditLogMock } },
      ],
    }).compile();

    service = module.get<WalletPassesService>(WalletPassesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPassConfig', () => {
    it('regresa el pase y el negocio', async () => {
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'business-1', name: 'Mi Negocio' } }),
        )
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'pass-1' } }));

      const result = await service.getPassConfig('owner-1');

      expect(result).toEqual({
        pass: { id: 'pass-1' },
        business: { id: 'business-1', name: 'Mi Negocio' },
      });
    });

    it('lanza NotFoundException si el negocio no existe', async () => {
      fromMock.mockReturnValueOnce(mockQueryResult({ data: null }));

      await expect(service.getPassConfig('owner-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('upsertPassConfig', () => {
    it('crea el diseño del pase y audita pass_config_created', async () => {
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'business-1' }, error: null }),
        ) // business
        .mockReturnValueOnce(mockQueryResult({ data: null })) // existingPass
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'pass-1', background_color: '#2563EB' },
            error: null,
          }),
        ); // insert

      const result = await service.upsertPassConfig('owner-1', {});

      expect(result).toEqual({ id: 'pass-1', background_color: '#2563EB' });
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'pass_config_created' }),
      );
    });

    it('actualiza el diseño existente y audita pass_config_updated', async () => {
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'business-1' }, error: null }),
        ) // business
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'pass-1' } })) // existingPass
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'pass-1', background_color: '#000000' },
            error: null,
          }),
        ); // update

      const result = await service.upsertPassConfig('owner-1', {
        background_color: '#000000',
      });

      expect(result).toEqual({ id: 'pass-1', background_color: '#000000' });
      expect(auditLogMock).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'pass_config_updated' }),
      );
    });
  });

  describe('generatePassUrl', () => {
    it('lanza InternalServerErrorException si faltan variables de entorno de Google Wallet', async () => {
      delete process.env.GOOGLE_WALLET_CLASS_ID;

      await expect(service.generatePassUrl('installation-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('lanza NotFoundException si el negocio detrás de la instalación está eliminado', async () => {
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({ data: { customer_id: 'customer-1' } }),
        ) // pass_installations
        .mockReturnValueOnce(
          mockQueryResult({ data: { business_id: 'business-1' } }),
        ) // customers
        .mockReturnValueOnce(mockQueryResult({ data: null })); // businesses (eliminado)

      await expect(service.generatePassUrl('installation-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('genera la URL de Google Wallet cuando todo es válido', async () => {
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({ data: { customer_id: 'customer-1' } }),
        ) // pass_installations
        .mockReturnValueOnce(
          mockQueryResult({ data: { business_id: 'business-1' } }),
        ) // customers
        .mockReturnValueOnce(mockQueryResult({ data: { name: 'Mi Negocio' } })) // businesses
        .mockReturnValueOnce(
          mockQueryResult({
            data: { description: 'Tarjeta', background_color: '#2563EB' },
          }),
        ); // passes

      const result = await service.generatePassUrl('installation-1');

      expect(result).toEqual({
        url: 'https://pay.google.com/gp/v/save/signed-jwt-token',
      });
    });
  });

  describe('updatePassObject', () => {
    it('no hace nada si faltan variables de entorno de Google Wallet (no lanza error)', async () => {
      delete process.env.GOOGLE_WALLET_ISSUER_ID;

      await expect(
        service.updatePassObject('installation-1', 3, 10),
      ).resolves.toBeUndefined();
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it('actualiza el pase en Google Wallet', async () => {
      await service.updatePassObject('installation-1', 3, 10);

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PATCH' }),
      );
    });

    it('no lanza error si Google Wallet falla (se traga el error)', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Google caído'));

      await expect(
        service.updatePassObject('installation-1', 3, 10),
      ).resolves.toBeUndefined();
    });
  });
});
