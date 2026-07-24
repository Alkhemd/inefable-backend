# 006 · Dashboard de Analíticas (Dueño)

**Estado:** propuesta

## Qué hace

Provee un conjunto de endpoints REST diseñados para alimentar el panel de control del dueño del negocio. Permite visualizar métricas clave de retención y lealtad, incluyendo la adopción del pase, la actividad de sellos, las recompensas canjeadas y el rendimiento del personal (cajeros).

Métricas propuestas para el MVP:
1. **Pases Activos**: Total de clientes que tienen la tarjeta instalada actualmente.
2. **Total de Sellos Otorgados**: Volumen general de actividad.
3. **Recompensas Canjeadas**: Cuántos clientes llegaron a la meta y reclamaron su premio.
4. **Ranking de Cajeros**: Qué empleados están registrando más sellos.
5. **Actividad Reciente**: Un feed con los últimos escaneos realizados.

## Por qué

Un programa de lealtad no sirve si el dueño no puede medir su impacto. Sin estas métricas, el dueño no sabe cuántos clientes están regresando ni qué cajeros están utilizando correctamente el sistema de escaneo. Este módulo hace tangible el valor de Inefable Wallet para el negocio.

## Criterios de aceptación

- [ ] Se expone un endpoint `GET /analytics/kpis` que retorna las métricas globales (Pases activos, Sellos totales, Canjes totales).
- [ ] Se expone un endpoint `GET /analytics/employees` que retorna el ranking de cajeros basado en `stamp_transactions`.
- [ ] Se expone un endpoint `GET /analytics/recent` que retorna las últimas transacciones paginadas.
- [ ] Todos los endpoints están protegidos y exigen que el usuario esté autenticado.
- [ ] Los datos devueltos se filtran estrictamente por el `business_id` del usuario autenticado (Seguridad).

## Fuera de alcance

- Gráficas de tendencias a lo largo del tiempo (por ejemplo, "sellos por mes" o "adquisición por semana"). Esto se dejará para una versión posterior (v2) del dashboard, para mantener este MVP enfocado y rápido de entregar.
- Exportación de reportes a PDF o CSV.
