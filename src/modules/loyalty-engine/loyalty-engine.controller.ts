import { Controller, Post, Body, Get, Patch, UseGuards, Ip } from '@nestjs/common';
import { LoyaltyEngineService } from './loyalty-engine.service';
import { ScanPassDto } from './dto/scan-pass.dto';
import { UpdateLoyaltyConfigDto } from './dto/update-loyalty-config.dto';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@Controller('loyalty-engine')
export class LoyaltyEngineController {
  constructor(private readonly loyaltyEngineService: LoyaltyEngineService) {}

  @UseGuards(SupabaseAuthGuard)
  @Get('config')
  async getConfig(@CurrentUser() user: any) {
    return this.loyaltyEngineService.getLoyaltyConfig(user.id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Patch('config')
  async updateConfig(@CurrentUser() user: any, @Body() dto: UpdateLoyaltyConfigDto) {
    return this.loyaltyEngineService.upsertLoyaltyConfig(user.id, dto);
  }

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
