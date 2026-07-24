# Plan de Implementación: 006 - Dashboard de Analíticas

Este documento detalla la estructura técnica de los endpoints REST para proveer datos reales al panel de control del dueño del negocio, usando las tablas integradas de Supabase.

## Arquitectura del Módulo

Crearemos un nuevo módulo `analytics` en NestJS completamente dedicado a extraer métricas, con el fin de mantener separada la lógica de lectura de las analíticas del resto de operaciones de escritura (lealtad y cajeros).

### 1. Controlador (`analytics.controller.ts`)
- **Rutas Protegidas**: Uso global del guard `@UseGuards(SupabaseAuthGuard)` y el decorador `@CurrentUser()`.
- **Endpoints**:
  - `GET /analytics/kpis`: Retorna indicadores principales (Pases, Sellos, Canjes).
  - `GET /analytics/employees`: Retorna el ranking de cajeros.
  - `GET /analytics/recent`: Retorna las últimas 10 transacciones.

### 2. Servicio (`analytics.service.ts`)
- Inyecta `SupabaseService` para interactuar con la base de datos usando el `Service Role Key` del backend (para hacer conteos globales seguros).
- **Consultas principales**:
  - Utiliza `.select('*', { count: 'exact' })` en Supabase para obtener la cantidad total de pases activos y canjes sin descargar grandes listas de datos en memoria.
  - **Relaciones (Joins)**: Realiza consultas cruzadas entre `stamp_transactions` y `employees` para estructurar la tabla de clasificación.
  - Aplica un filtro estricto por `business_id` en todas las consultas para asegurar que el dueño autenticado jamás reciba datos que no le pertenecen.

### 3. Registro en la Aplicación
- Creación de `analytics.module.ts`.
- Inyección de `AnalyticsModule` en los `imports` principales de `app.module.ts`.
