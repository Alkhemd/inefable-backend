# Memoria Técnica: 006 - Dashboard de Analíticas

## Propósito
Este documento registra la creación del Módulo 006, encargado de extraer y procesar los datos de Supabase para alimentar el panel de control del dueño del negocio. Provee visibilidad sobre el rendimiento del programa de lealtad.

## Componentes Implementados

### 1. Extracción de KPIs (Indicadores Clave)
- Se implementó `GET /analytics/kpis`.
- **Lógica**: Se agruparon tres métricas críticas en un solo endpoint para optimizar las peticiones de red del frontend.
  - **Pases Activos**: Total de pases instalados que no han sido removidos (`is_removed = false`).
  - **Total de Sellos**: Sumatoria del `stamp_count` en la tabla `stamp_transactions`.
  - **Canjes Totales**: Conteo de premios entregados a través de la tabla `redemptions`.
- **Rendimiento**: Para el conteo se utilizó el modificador de Supabase `{ count: 'exact', head: true }` para devolver solo el número de registros sin tener que descargar todos los datos a la memoria de Node.js.

### 2. Clasificación de Cajeros (Leaderboard)
- Se implementó `GET /analytics/employees`.
- **Lógica**: Extrae todos los empleados del negocio y luego itera sobre todas las transacciones de sellos válidas del local, acumulando la cantidad de sellos que cada cajero ha puesto.
- **Utilidad**: Permite al dueño auditar quién está usando la app de escaneo y gamificar el desempeño de los empleados.

### 3. Registro de Actividad en Tiempo Real
- Se implementó `GET /analytics/recent`.
- **Lógica**: Trae las 10 transacciones más recientes (`order('created_at', { ascending: false })`). Incluye la información relacionada (JOIN) del nombre del empleado que dio el sello y la plataforma (`device_platform`) del pase escaneado.

## Seguridad e Integridad
- Todo el módulo está protegido con `SupabaseAuthGuard`.
- Cada consulta en el `AnalyticsService` pasa por el filtro `eq('business_id', userId)`, garantizando un diseño Multi-Tenant seguro en el que ningún negocio puede ver los números o cajeros de su competencia.

## Deuda Técnica / Próximos Pasos
- **Filtros por Fecha**: Actualmente los KPIs muestran totales históricos. En una versión v2, se debería añadir la capacidad de filtrar por "Últimos 7 días" o "Este mes" mediante query parameters (ej. `?dateRange=30d`).
- **Paginación**: El feed de actividad reciente solo trae 10. Posteriormente podría implementarse una paginación por cursores.
