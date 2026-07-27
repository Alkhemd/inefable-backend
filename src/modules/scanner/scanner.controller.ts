import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ScannerService } from './scanner.service';
import { CashierAuthGuard } from '../../core/guards/cashier-auth.guard';

@Controller('scanner')
@UseGuards(CashierAuthGuard)
export class ScannerController {
  constructor(private readonly scannerService: ScannerService) {}

  @Post('stamp')
  async addStamp(@Request() req, @Body('customerId') customerId: string) {
    const cashierPayload = req.cashier;
    return this.scannerService.addStamp(cashierPayload, customerId);
  }
}

