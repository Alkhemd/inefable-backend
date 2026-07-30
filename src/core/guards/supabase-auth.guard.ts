import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';

interface RequestWithUser {
  headers: { authorization?: string };
  user?: User;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token no provisto');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Formato de token inválido');
    }

    // Validar con Supabase
    const { data, error } =
      await this.supabaseService.client.auth.getUser(token);

    if (error || !data.user) {
      console.error(
        'SupabaseAuthGuard Error:',
        error?.message || 'No user found',
      );
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // Inyectar el usuario en la request
    request.user = data.user;

    return true;
  }
}
