# Plan Técnico: Gestión de Cajeros (003-employees)

Este plan documenta la implementación de la gestión del personal, enfocado en el hashing de contraseñas.

## Arquitectura

1. **Esquema SQL**: Tabla `employees` con `pin_hash`.
2. **NestJS Module**: `src/modules/employees/`.
3. **Validación (DTOs)**: `class-validator` para asegurar que el `pin` sea de exactamente 4 dígitos y `name` no esté vacío.
4. **Seguridad Crítica (Hashing)**: El DTO recibe un PIN plano. El Servicio usa `bcrypt` para crear el hash, e inserta el hash en BD. El PIN plano es descartado y nunca almacenado.
5. **Seguridad RLS**: Las consultas aseguran que `business_id` corresponde al `owner_user_id` del usuario autenticado (via `SupabaseAuthGuard`).

## Flujo de Endpoints
1. `POST /employees`: Recibe JWT (Dueño) y Body (name, pin). Obtiene el `business_id`, hashea el PIN, e inserta.
2. `GET /employees`: Lista los cajeros del dueño.
3. `PATCH /employees/:id/deactivate`: Cambia `is_active` a `false`.
