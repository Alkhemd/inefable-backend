# Roadmap

_Orden y estado de las features. Es la vista de "qué hay hecho, qué toca ahora y qué viene". Cada entrada apunta a su carpeta en `features/`._

## Hecho ✅

_Features completadas, en orden de implementación._

1. **001-auth** — Implementación del sistema de autenticación seguro mediante Supabase JWT y control de acceso basado en roles (RBAC) para proteger la plataforma.
2. **002-merchants** — Módulo para el registro y onboarding self-service de comercios (Dueños) y gestión de su información.
3. **003-employees** — Módulo crítico para la seguridad: creación de PINs encriptados (bcrypt), turnos de cajeros.
4. **004-loyalty-passes** — Emisión de tarjetas Google Wallet, inyectando QR dinámico con el Customer ID.

## Siguiente 🔜

_Lo próximo a abordar. Idealmente una sola feature "en curso" a la vez._

5. **005-loyalty-engine** — El motor principal. Escaneo de QR, otorgamiento de sellos, validación de reglas de antifraude (IP/WIFI, geocerca, horario, rate limits).

## Backlog / ideas 💡

_Sin comprometer ni ordenar del todo. Ideas que respetan la constitución._
- **003-employees** — Módulo crítico para la seguridad: creación de PINs, turnos de cajeros y validación de red Wi-Fi para evitar fraude interno.
- **004-loyalty-passes** — Lógica de diseño y generación de tarjetas digitales dinámicas con integración directa a Google Wallet API.
- **005-loyalty-engine** — El cerebro de la fidelización: lógica de acumulación y redención de sellos bajo estrictas reglas antifraude (tiempo y GPS).
- **006-analytics** — Extracción de métricas de retención y uso para poblar el Dashboard Web del dueño.

> Cada feature nueva se crea como `features/NNN-nombre-feature/` con `spec.md`, `plan.md` y `tasks.md` antes de tocar código.
