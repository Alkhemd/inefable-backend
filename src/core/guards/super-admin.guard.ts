import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

// Requiere correr después de SupabaseAuthGuard en la cadena de guards,
// ya que depende de que `request.user` haya sido inyectado por ese guard.
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const superAdminId = process.env.SUPER_ADMIN_USER_ID;

    if (!superAdminId || request.user?.id !== superAdminId) {
      throw new ForbiddenException('No tienes permisos de administrador.');
    }

    return true;
  }
}
