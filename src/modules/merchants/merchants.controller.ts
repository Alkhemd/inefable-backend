import { Controller, Get, Post, Patch, Body, UseGuards, Ip } from '@nestjs/common';
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
  async create(@CurrentUser() user: any, @Body() dto: CreateMerchantDto) {
    return this.merchantsService.create(user.id, dto);
  }

  @Get('me')
  async getMyBusiness(@CurrentUser() user: any) {
    return this.merchantsService.getMyBusiness(user.id);
  }

  @Patch('me')
  async updateMyBusiness(@CurrentUser() user: any, @Body() dto: UpdateMerchantDto) {
    return this.merchantsService.updateMyBusiness(user.id, dto);
  }

  @Post('security/ip')
  async registerIp(@CurrentUser() user: any, @Ip() ip: string) {
    // Si la request pasa por un proxy (como Render), el IP real podría estar en x-forwarded-for,
    // NestJS maneja esto si se configura `app.set('trust proxy', true)` en main.ts.
    return this.merchantsService.updateMyBusiness(user.id, { authorized_ip: ip });
  }

  @Post('security/gps')
  async registerGps(@CurrentUser() user: any, @Body() body: { lat: number, lng: number, radius_meters: number }) {
    return this.merchantsService.updateMyBusiness(user.id, { 
      lat: body.lat, 
      lng: body.lng, 
      radius_meters: body.radius_meters 
    });
  }

  @Post('security/mode')
  async setSecurityMode(@CurrentUser() user: any, @Body() body: { anti_fraud_mode: string }) {
    return this.merchantsService.updateMyBusiness(user.id, { anti_fraud_mode: body.anti_fraud_mode });
  }
}
