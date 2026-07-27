import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class CashierAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token no provisto');
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw new UnauthorizedException('Formato de token inválido');
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      throw new UnauthorizedException('Configuración de seguridad del servidor inválida');
    }

    try {
      // Validar JWT con nuestro secret
      const payload = jwt.verify(token, jwtSecret) as any;

      if (payload.type !== 'cashier') {
        throw new UnauthorizedException('El token no pertenece a un cajero válido');
      }

      // Inyectar el payload en la request
      request.cashier = payload;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
