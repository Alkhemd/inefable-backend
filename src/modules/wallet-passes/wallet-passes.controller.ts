import {
  BadRequestException,
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Req,
  UseGuards,
  Ip,
  Headers,
} from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import type { FastifyRequest } from 'fastify';
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

  @UseGuards(SupabaseAuthGuard)
  @Post('hero-image')
  async uploadHeroImage(
    @CurrentUser() user: User,
    @Req() req: FastifyRequest,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const file = await req.file();

    if (!file) {
      throw new BadRequestException('No se recibió ningún archivo.');
    }

    const buffer = await file.toBuffer();

    return this.walletPassesService.uploadHeroImage(
      user.id,
      buffer,
      file.mimetype,
      ip,
      userAgent,
    );
  }
}
