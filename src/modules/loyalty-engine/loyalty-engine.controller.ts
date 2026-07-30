import {
  Controller,
  Body,
  Get,
  Patch,
  UseGuards,
  Ip,
  Headers,
} from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import { LoyaltyEngineService } from './loyalty-engine.service';
import { UpdateLoyaltyConfigDto } from './dto/update-loyalty-config.dto';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@Controller('loyalty-engine')
export class LoyaltyEngineController {
  constructor(private readonly loyaltyEngineService: LoyaltyEngineService) {}

  @UseGuards(SupabaseAuthGuard)
  @Get('config')
  async getConfig(@CurrentUser() user: User) {
    return this.loyaltyEngineService.getLoyaltyConfig(user.id);
  }

  @UseGuards(SupabaseAuthGuard)
  @Patch('config')
  async updateConfig(
    @CurrentUser() user: User,
    @Body() dto: UpdateLoyaltyConfigDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.loyaltyEngineService.upsertLoyaltyConfig(
      user.id,
      dto,
      ip,
      userAgent,
    );
  }
}
