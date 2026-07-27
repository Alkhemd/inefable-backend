import { Controller, Post, Body, Get, Patch, UseGuards } from '@nestjs/common';
import { WalletPassesService } from './wallet-passes.service';
import { GeneratePassDto } from './dto/generate-pass.dto';
import { UpdatePassConfigDto } from './dto/update-pass-config.dto';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@Controller('wallet-passes')
export class WalletPassesController {
  constructor(private readonly walletPassesService: WalletPassesService) {}

  @UseGuards(SupabaseAuthGuard)
  @Get('config')
  async getConfig(@CurrentUser() user: any) {
    return this.walletPassesService.getPassConfig(user.id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Patch('config')
  async updateConfig(@CurrentUser() user: any, @Body() dto: UpdatePassConfigDto) {
    return this.walletPassesService.upsertPassConfig(user.id, dto);
  }

  @Post('generate')
  async generatePass(@Body() dto: GeneratePassDto) {
    return this.walletPassesService.generatePassUrl(dto.customerId);
  }
}
