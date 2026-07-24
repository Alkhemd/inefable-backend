# Plan Técnico: Gestión de Comercios (002-merchants)

Este plan documenta la implementación de la capa de negocios para los Dueños, respetando la tabla original `businesses` de Supabase.

## Arquitectura

1. **Esquema de Base de Datos**: Se asume la existencia de la tabla `businesses` en Supabase con RLS (Row Level Security) que asegura que el `owner_user_id` coincida con el JWT del usuario autenticado.
2. **NestJS Module (`src/modules/merchants/`)**: Módulo que interactúa con la tabla `businesses`.
3. **Validación (DTOs)**: Se usará `class-validator` para validar estrictamente que la industria (`industry`) y el email (`contact_email`) tengan el formato correcto según la base de datos.
4. **Seguridad**: Todas las rutas de este módulo estarán protegidas por `SupabaseAuthGuard`.

## Dependencias Requeridas
- `class-validator`
- `class-transformer`

## Flujo de Endpoints
1. `POST /merchants`: Crea el negocio enviando el JWT y el body. El `owner_user_id` se extrae en el controlador y se envía al servicio.
2. `GET /merchants/me`: Extrae el negocio del usuario autenticado actual.
3. `PATCH /merchants/me`: Actualiza los datos permitidos del negocio (nombre, industria, logo, teléfono).
