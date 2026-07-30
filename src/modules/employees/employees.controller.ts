import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Ip,
  Headers,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@supabase/supabase-js';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeScheduleDto } from './dto/update-employee-schedule.dto';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  @UseGuards(SupabaseAuthGuard)
  async createEmployee(
    @CurrentUser() user: User,
    @Body() dto: CreateEmployeeDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.employeesService.createEmployee(user.id, dto, ip, userAgent);
  }

  @Get()
  @UseGuards(SupabaseAuthGuard)
  async getEmployees(@CurrentUser() user: User) {
    return this.employeesService.getEmployees(user.id);
  }

  @Patch(':id/deactivate')
  @UseGuards(SupabaseAuthGuard)
  async deactivateEmployee(
    @CurrentUser() user: User,
    @Param('id') employeeId: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.employeesService.deactivateEmployee(
      user.id,
      employeeId,
      ip,
      userAgent,
    );
  }

  @Patch(':id/schedule')
  @UseGuards(SupabaseAuthGuard)
  async updateEmployeeSchedule(
    @CurrentUser() user: User,
    @Param('id') employeeId: string,
    @Body() dto: UpdateEmployeeScheduleDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.employeesService.updateEmployeeSchedule(
      user.id,
      employeeId,
      dto,
      ip,
      userAgent,
    );
  }

  @Throttle({ login: { limit: 5, ttl: 60000 } })
  @Post('login')
  async loginEmployee(
    @Body('businessId') businessId: string,
    @Body('pin') pin: string,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.employeesService.loginEmployee(businessId, pin, ip, userAgent);
  }
}
