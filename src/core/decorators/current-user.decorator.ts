import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@supabase/supabase-js';

interface RequestWithUser {
  user: User;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user; // Inyectado previamente por el SupabaseAuthGuard
  },
);
