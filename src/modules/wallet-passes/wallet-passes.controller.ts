import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  UseGuards,
  Ip,
  Headers,
} from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
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
  async getConfig(@CurrentUser() user: User) {
    return this.walletPassesService.getPassConfig(user.id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Patch('config')
  async updateConfig(
    @CurrentUser() user: User,
    @Body() dto: UpdatePassConfigDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.walletPassesService.upsertPassConfig(
      user.id,
      dto,
      ip,
      userAgent,
    );
  }

  @Post('generate')
  async generatePass(@Body() dto: GeneratePassDto) {
    return this.walletPassesService.generatePassUrl(dto.customerId);
  }
}
