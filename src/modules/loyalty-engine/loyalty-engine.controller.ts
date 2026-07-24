import { Controller, Post, Body, UseGuards, Ip } from '@nestjs/common';
import { LoyaltyEngineService } from './loyalty-engine.service';
import { ScanPassDto } from './dto/scan-pass.dto';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@Controller('loyalty-engine')
export class LoyaltyEngineController {
  constructor(private readonly loyaltyEngineService: LoyaltyEngineService) {}

  @Post('scan')
  @UseGuards(SupabaseAuthGuard)
  async scanPass(@Body() dto: ScanPassDto, @CurrentUser() user: any, @Ip() ip: string) {
    return this.loyaltyEngineService.processScan(
      dto.customerId,
      user.id, // ID del cajero logueado
      ip,
      dto.lat,
      dto.lng
    );
  }
}
