import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Ip,
  Headers,
} from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@Controller('merchants')
@UseGuards(SupabaseAuthGuard)
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateMerchantDto) {
    return this.merchantsService.create(user.id, dto);
  }

  @Get('me')
  async getMyBusiness(@CurrentUser() user: User) {
    return this.merchantsService.getMyBusiness(user.id);
  }

  @Patch('me')
  async updateMyBusiness(
    @CurrentUser() user: User,
    @Body() dto: UpdateMerchantDto,
  ) {
    return this.merchantsService.updateMyBusiness(user.id, dto);
  }

  @Post('security/ip')
  async registerIp(
    @CurrentUser() user: User,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    // @Ip() ya lee la IP real del cliente vía X-Forwarded-For, gracias a
    // `trustProxy: true` configurado en el FastifyAdapter de main.ts.
    return this.merchantsService.updateMyBusiness(
      user.id,
      { authorized_ip: ip },
      { action: 'business_security_ip_updated', ip, userAgent },
    );
  }

  @Post('security/gps')
  async registerGps(
    @CurrentUser() user: User,
    @Body() body: { lat: number; lng: number; radius_meters: number },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.merchantsService.updateMyBusiness(
      user.id,
      {
        lat: body.lat,
        lng: body.lng,
        radius_meters: body.radius_meters,
      },
      { action: 'business_security_gps_updated', ip, userAgent },
    );
  }

  @Post('security/mode')
  async setSecurityMode(
    @CurrentUser() user: User,
    @Body() body: { anti_fraud_mode: string },
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.merchantsService.updateMyBusiness(
      user.id,
      { anti_fraud_mode: body.anti_fraud_mode },
      { action: 'business_security_mode_updated', ip, userAgent },
    );
  }
}
