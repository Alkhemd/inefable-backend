import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { JoinProgramDto } from './dto/join-program.dto';

@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // Endpoint PROTEGIDO: solo para merchants autenticados
  @UseGuards(SupabaseAuthGuard)
  @Get()
  async getCustomers(@CurrentUser() user: any) {
    return this.customersService.getCustomersByBusinessOwner(user.id);
  }

  // Endpoint PÚBLICO: para que clientes finales se registren
  @Post('join')
  async joinProgram(@Body() dto: JoinProgramDto) {
    return this.customersService.joinLoyaltyProgram(dto);
  }
}
