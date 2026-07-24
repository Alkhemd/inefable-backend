# Memoria Técnica: 003-employees

**Implementado el:** Julio 2026

## Resumen Arquitectónico

- **Objetivo:** Gestión de personal (cajeros) por parte del Dueño. Permite crear, listar y dar de baja (soft delete) a los empleados.
- **Tabla Supabase:** `employees`. Enlazada a `businesses(id)`.
- **Rutas Principales (`/employees`)**:
  - `POST /employees`
  - `GET /employees`
  - `PATCH /employees/:id/deactivate`

## Seguridad y Prevención de Fraude

1. **Cifrado de PINs (bcrypt):** El frontend o cliente envía un PIN plano de 4 dígitos. El backend *nunca* lo guarda, usa `bcrypt.hash()` con salt de 10. Para la autenticación posterior del cajero, se deberá usar `bcrypt.compare()`.
2. **Filtrado Backend-Side Seguro:** Antes de crear o desactivar un cajero, el backend primero consulta a la tabla `businesses` usando el `owner_user_id` del token JWT. Así aseguramos que el empleado que se está modificando pertenezca a la tienda de la que es dueño el usuario.
3. **Soft Deletes:** Los cajeros no se borran (DELETE) porque destruirían el historial de a quién le dieron un sello. En su lugar, se actualiza `is_active = false`.
