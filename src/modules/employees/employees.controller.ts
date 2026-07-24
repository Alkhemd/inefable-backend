import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@Controller('employees')
@UseGuards(SupabaseAuthGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Post()
  async createEmployee(@CurrentUser() user: any, @Body() dto: CreateEmployeeDto) {
    return this.employeesService.createEmployee(user.id, dto);
  }

  @Get()
  async getEmployees(@CurrentUser() user: any) {
    return this.employeesService.getEmployees(user.id);
  }

  @Patch(':id/deactivate')
  async deactivateEmployee(@CurrentUser() user: any, @Param('id') employeeId: string) {
    return this.employeesService.deactivateEmployee(user.id, employeeId);
  }
}
