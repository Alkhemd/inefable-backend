import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { WalletPassesService } from '../wallet-passes/wallet-passes.service';
import { mockQueryResult } from '../../test-utils/mock-supabase-query';
import { JoinProgramDto } from './dto/join-program.dto';

describe('CustomersService', () => {
  let service: CustomersService;
  let fromMock: jest.Mock;
  let generatePassUrlMock: jest.Mock;

  beforeEach(async () => {
    fromMock = jest.fn();
    generatePassUrlMock = jest
      .fn()
      .mockResolvedValue({ url: 'https://pay.google.com/gp/v/save/token' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: SupabaseService, useValue: { client: { from: fromMock } } },
        {
          provide: WalletPassesService,
          useValue: { generatePassUrl: generatePassUrlMock },
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCustomersByBusinessOwner', () => {
    it('regresa los clientes con el total de sellos válidos', async () => {
      fromMock
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'business-1' }, error: null }),
        ) // businesses
        .mockReturnValueOnce(
          mockQueryResult({
            data: [
              {
                installed_at: '2026-01-01',
                customers: {
                  id: 'customer-1',
                  first_name: 'Ana',
                  last_name: 'Pérez',
                  email: 'a@a.com',
                  phone_number: null,
                },
                stamp_transactions: [
                  { stamp_count: 3, is_valid: true },
                  { stamp_count: 5, is_valid: false }, // no debe contar
                ],
              },
            ],
            error: null,
          }),
        ); // pass_installations join

      const result = await service.getCustomersByBusinessOwner('owner-1');

      expect(result).toEqual([
        {
          id: 'customer-1',
          first_name: 'Ana',
          last_name: 'Pérez',
          email: 'a@a.com',
          phone_number: null,
          installed_at: '2026-01-01',
          total_stamps: 3,
        },
      ]);
    });

    it('lanza NotFoundException si el negocio no existe', async () => {
      fromMock.mockReturnValueOnce(
        mockQueryResult({ data: null, error: null }),
      );

      await expect(
        service.getCustomersByBusinessOwner('owner-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('joinLoyaltyProgram', () => {
    const dto: JoinProgramDto = {
      businessId: 'business-1',
      firstName: 'Ana',
      lastName: 'Pérez',
      email: 'ana@perez.com',
    };

    it('lanza NotFoundException si el negocio no existe o está eliminado', async () => {
      fromMock.mockReturnValueOnce(mockQueryResult({ data: null }));

      await expect(service.joinLoyaltyProgram(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza NotFoundException si el negocio no tiene tarjeta configurada', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } })) // business activo
        .mockReturnValueOnce(mockQueryResult({ data: null, error: null })); // passes

      await expect(service.joinLoyaltyProgram(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('registra un cliente nuevo con una instalación nueva y regresa la URL del pase', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } })) // business activo
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'pass-1', business_id: 'business-1' },
            error: null,
          }),
        ) // passes
        .mockReturnValueOnce(mockQueryResult({ data: null })) // existingCustomer
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'customer-new' }, error: null }),
        ) // insert customers
        .mockReturnValueOnce(mockQueryResult({ data: [] })) // existingInstallations
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'installation-new' }, error: null }),
        ); // insert pass_installations

      const result = await service.joinLoyaltyProgram(dto);

      expect(result).toEqual({
        walletUrl: 'https://pay.google.com/gp/v/save/token',
        customerId: 'customer-new',
        installationId: 'installation-new',
      });
      expect(generatePassUrlMock).toHaveBeenCalledWith('installation-new');
    });

    it('reutiliza cliente e instalación existentes sin volver a insertarlos', async () => {
      fromMock
        .mockReturnValueOnce(mockQueryResult({ data: { id: 'business-1' } })) // business activo
        .mockReturnValueOnce(
          mockQueryResult({
            data: { id: 'pass-1', business_id: 'business-1' },
            error: null,
          }),
        ) // passes
        .mockReturnValueOnce(
          mockQueryResult({ data: { id: 'customer-existing' } }),
        ) // existingCustomer
        .mockReturnValueOnce(
          mockQueryResult({ data: [{ id: 'installation-existing' }] }),
        ); // existingInstallations

      const result = await service.joinLoyaltyProgram(dto);

      expect(result).toEqual({
        walletUrl: 'https://pay.google.com/gp/v/save/token',
        customerId: 'customer-existing',
        installationId: 'installation-existing',
      });
      // Solo 4 llamadas a .from(): no debió insertar ni cliente ni instalación
      expect(fromMock).toHaveBeenCalledTimes(4);
    });
  });
});
