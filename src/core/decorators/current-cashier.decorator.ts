import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CashierJwtPayload } from '../guards/cashier-auth.guard';

interface RequestWithCashier {
  cashier: CashierJwtPayload;
}

export const CurrentCashier = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CashierJwtPayload => {
    const request = ctx.switchToHttp().getRequest<RequestWithCashier>();
    return request.cashier; // Inyectado previamente por el CashierAuthGuard
  },
);
