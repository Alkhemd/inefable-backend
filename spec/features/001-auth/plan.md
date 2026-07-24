# Plan Técnico: Autenticación (001-auth)

Este plan documenta la implementación de la capa de seguridad usando validación JWT stateless con Supabase.

## Arquitectura

Para mantener NestJS limpio y escalable para Serverless (0 estado local), se usará el cliente oficial de `@supabase/supabase-js`. 

1. **Infraestructura (`src/infrastructure/supabase/`)**: Un módulo global que inicializa el cliente de Supabase. Expone un método para llamar a `supabase.auth.getUser(token)`.
2. **Core Security (`src/core/guards/supabase-auth.guard.ts`)**: Un Guard nativo de NestJS que intercepta las peticiones que requieren autenticación, extrae el Bearer token y usa el servicio de Supabase para validar.
3. **Controladores (`src/modules/auth/`)**: Rutas protegidas que utilizan un decorador `@CurrentUser()` para recibir la identidad del usuario y actuar en consecuencia.

## Dependencias Requeridas
- `@supabase/supabase-js`

## Flujo de Seguridad
1. El cliente envía `Authorization: Bearer <TOKEN>`.
2. `SupabaseAuthGuard` intercepta. Si no hay token, arroja `401 Unauthorized`.
3. El Guard pide a `SupabaseService` validar el token. Si expira o es falso, arroja `401`.
4. Si es válido, el Guard inyecta `request.user = data.user`.
5. El endpoint se ejecuta normalmente.
