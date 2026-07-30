import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Ip,
  Headers,
} from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import { AdminService } from './admin.service';
import { ListBusinessesQueryDto } from './dto/list-businesses-query.dto';
import { ListCustomersQueryDto } from './dto/list-customers-query.dto';
import { UpdateBusinessStatusDto } from './dto/update-business-status.dto';
import { UpdateMerchantDto } from '../merchants/dto/update-merchant.dto';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';
import { SuperAdminGuard } from '../../core/guards/super-admin.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@Controller('admin')
@UseGuards(SupabaseAuthGuard, SuperAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('businesses')
  async getBusinesses(@Query() query: ListBusinessesQueryDto) {
    return this.adminService.getBusinesses(query.status);
  }

  @Patch('businesses/:id/status')
  async updateBusinessStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateBusinessStatusDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminService.updateBusinessStatus(
      id,
      dto.status,
      user.id,
      ip,
      userAgent,
    );
  }

  @Patch('businesses/:id')
  async updateBusiness(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateMerchantDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminService.updateBusiness(id, dto, user.id, ip, userAgent);
  }

  @Delete('businesses/:id')
  async deleteBusiness(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.adminService.deleteBusiness(id, user.id, ip, userAgent);
  }

  @Get('metrics')
  async getMetrics() {
    return this.adminService.getGlobalMetrics();
  }

  @Get('customers')
  async getCustomers(@Query() query: ListCustomersQueryDto) {
    return this.adminService.getCustomers(query.businessId);
  }
}
