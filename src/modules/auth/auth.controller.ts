import { Controller, Get, UseGuards } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import { SupabaseAuthGuard } from '../../core/guards/supabase-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  getMe(@CurrentUser() user: User) {
    // Si la request llega aquí, es porque el JWT de Supabase es válido
    // y el Guard inyectó al usuario exitosamente.
    return {
      message: 'Autenticación exitosa',
      user: user,
    };
  }
}
