# Memoria Técnica: 002-merchants

**Implementado el:** Julio 2026

## Resumen Arquitectónico

- **Objetivo:** Permitir a un Dueño (Merchant) gestionar el perfil de su negocio (tabla `businesses`).
- **Tabla Supabase:** `businesses`. Usa RLS para asegurar que nadie lea/edite negocios de otro `owner_user_id`.
- **Rutas Principales (`/merchants`)**:
  - `POST /merchants`
  - `GET /merchants/me`
  - `PATCH /merchants/me`

## Cómo Funciona (Referencia rápida para la IA)

1. **Validación Automática:** Activamos el `ValidationPipe` globalmente en `main.ts`.
2. **DTOs Estrictos:** Usamos `class-validator`. La industria solo puede ser `restaurant`, `retail`, `service` u `other`. El email debe ser un email válido.
3. **Manejo de Errores de BD:** Si el usuario intenta crear un segundo negocio, la constraint de Supabase (Unique) arroja el error de Postgres `23505`, el cual el `MerchantsService` atrapa y convierte en un bonito `ConflictException` (HTTP 409). Si no tiene negocio y hace GET, Supabase devuelve `PGRST116` y se arroja un `NotFoundException` (HTTP 404).
