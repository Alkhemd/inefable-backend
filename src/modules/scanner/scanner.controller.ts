import { Controller, Post, Body, UseGuards, Ip, Headers } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { AddStampDto } from './dto/add-stamp.dto';
import { RedeemPrizeDto } from './dto/redeem-prize.dto';
import { CashierAuthGuard } from '../../core/guards/cashier-auth.guard';
import { CurrentCashier } from '../../core/decorators/current-cashier.decorator';
import type { CashierJwtPayload } from '../../core/guards/cashier-auth.guard';

@Controller('scanner')
@UseGuards(CashierAuthGuard)
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('stamp')
  async addStamp(
    @CurrentCashier() cashierPayload: CashierJwtPayload,
    @Body() dto: AddStampDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.scannerService.addStamp(
      cashierPayload,
      dto.customerId,
      ip,
      userAgent,
      dto.lat,
      dto.lng,
    );
  }

  @Post('redeem')
  async redeemPrize(
    @CurrentCashier() cashierPayload: CashierJwtPayload,
    @Body() dto: RedeemPrizeDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.scannerService.redeemPrize(
      cashierPayload,
      dto.customerId,
      ip,
      userAgent,
    );
  }
}
