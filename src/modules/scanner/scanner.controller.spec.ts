import { Test, TestingModule } from '@nestjs/testing';
import { ScannerController } from './scanner.controller';
import { ScannerService } from './scanner.service';
import { AddStampDto } from './dto/add-stamp.dto';
import { RedeemPrizeDto } from './dto/redeem-prize.dto';
import type { CashierJwtPayload } from '../../core/guards/cashier-auth.guard';

describe('ScannerController', () => {
  let controller: ScannerController;
  let scannerService: { addStamp: jest.Mock; redeemPrize: jest.Mock };

  const cashierPayload: CashierJwtPayload = {
    sub: 'employee-1',
    type: 'cashier',
    businessId: 'business-1',
    name: 'Empleado de prueba',
  };

  beforeEach(async () => {
    scannerService = {
      addStamp: jest.fn().mockResolvedValue({ message: 'ok' }),
      redeemPrize: jest.fn().mockResolvedValue({ message: 'ok' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScannerController],
      providers: [{ provide: ScannerService, useValue: scannerService }],
    }).compile();

    controller = module.get<ScannerController>(ScannerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('addStamp delega en ScannerService con el payload del cajero, ip, user-agent, lat y lng', async () => {
    const dto: AddStampDto = { customerId: 'installation-1', lat: 10, lng: 20 };

    await controller.addStamp(cashierPayload, dto, '1.2.3.4', 'jest-agent');

    expect(scannerService.addStamp).toHaveBeenCalledWith(
      cashierPayload,
      dto.customerId,
      '1.2.3.4',
      'jest-agent',
      dto.lat,
      dto.lng,
    );
  });

  it('redeemPrize delega en ScannerService con el payload del cajero, ip y user-agent', async () => {
    const dto: RedeemPrizeDto = { customerId: 'installation-1' };

    await controller.redeemPrize(cashierPayload, dto, '1.2.3.4', 'jest-agent');

    expect(scannerService.redeemPrize).toHaveBeenCalledWith(
      cashierPayload,
      dto.customerId,
      '1.2.3.4',
      'jest-agent',
    );
  });
});
