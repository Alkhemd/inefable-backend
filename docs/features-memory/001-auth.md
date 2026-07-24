# Memoria Técnica: 001-auth

**Implementado el:** Julio 2026

## Resumen Arquitectónico

- **Objetivo:** Proteger el backend usando validación JWT 100% Stateless sin usar dependencias mágicas (ni Passport, ni estrategias pesadas).
- **Herramienta Principal:** `@supabase/supabase-js` instanciado como un servicio global.

## Cómo Funciona (Referencia rápida para la IA)

1. **Capa de Seguridad (`src/core/guards/supabase-auth.guard.ts`)**: 
   Todo endpoint protegido debe tener `@UseGuards(SupabaseAuthGuard)`. Este Guard intercepta el header `Authorization: Bearer <token>`, extrae el JWT, y le pregunta directamente al servidor de Supabase si es válido usando `supabase.auth.getUser()`. Si falla, rechaza con `401 Unauthorized`.
   
2. **Inyección del Usuario (`src/core/decorators/current-user.decorator.ts`)**: 
   Una vez que el Guard da luz verde, inyecta los datos del usuario en la `request`. Para usar esos datos en cualquier Controlador, simplemente colocamos el decorador `@CurrentUser() user: any` en los parámetros.

## Dependencias Clave Restringidas
- **NO usar** estados locales. NestJS debe ignorar quién está conectado, de la autenticación se encarga puramente Supabase.
