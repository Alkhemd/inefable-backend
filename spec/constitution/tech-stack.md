# Tech stack y convenciones

_Cómo está construido el proyecto y las reglas que todo el código debe respetar. Es la referencia técnica que ningún plan de feature debería contradecir._

## Tecnologías

- **Lenguaje:** TypeScript Estricto.
- **Framework / runtime:** NestJS v10+ montado sobre Fastify (Node.js) para rendimiento extremo.
- **Base de datos:** PostgreSQL vía Supabase (con Supavisor en puerto 6543 para Transaction Pooling). Sin ORMs pesados.
- **SDK & Integraciones:** `@supabase/supabase-js` (BD y Auth), Google Wallet API (Emisión de pases).
- **Tests:** Jest (Suite nativa que incluye NestJS).
- **Despliegue:** Entorno Serverless (ej. Vercel o Cloud Run o hostinguer dependiendo de las exigencias de inefable) para auto-escalado instántaneo.

## Archivos / módulos clave

_Mapa breve de dónde vive cada cosa. Solo lo que un recién llegado necesita para orientarse._

- `spec/` — El corazón del Spec-Driven Development. Las reglas, misiones y planes técnicos antes de escribir código.
- `src/core/` — Capa de Seguridad (Guards y Filters). Aquí vive el escudo Anti-Fraude (validaciones GPS, IP, tiempo).
- `src/infrastructure/` — Conectores hacia el mundo exterior (Supabase y Google Wallet).
- `src/modules/` — Dominios de Negocio puros (Screaming Architecture): `auth`, `merchants`, `employees`, `wallet-passes`, `loyalty-engine`, y `analytics`.

## Comandos

- `npm run start:dev` — arranca el servidor en local con hot-reload.
- `npm run test` — ejecuta los tests (deben pasar antes de cada commit).
- `npm run lint` — revisa el estilo (antes de cada PR).
- `npm run build` — compila el código TypeScript a JavaScript de producción (carpeta `dist`).

## Modelo de datos / dominio

_Las entidades o estructuras centrales y sus reglas críticas._

- `Merchant` — Dueño del negocio / Tenant. Configura las reglas de lealtad.
- `Employee` (Cajero) — El actor más crítico en seguridad. Opera vía PWA usando un PIN. Todo `stamp` (sello) que se emita DEBE estar atado a su `employee_id` para auditoría.
- `Pass` — El pase digital emitido y almacenado en el Google Wallet del cliente final.
- `Stamp` — El sello individual. Sujeto a estrictas reglas de validación (IP de tienda, cercanía GPS <50m, umbral de tiempo).

## Convenciones

_Reglas de estilo y patrones a seguir._

- Nomenclatura: `camelCase` para variables/funciones, `PascalCase` para Clases/Módulos, y `kebab-case` para nombres de archivos (ej. `loyalty-engine.service.ts`).
- Validación Obligatoria: Toda entrada de datos HTTP (Payload) debe estar tipada y validada usando DTOs con `class-validator` y `class-transformer`.
- Estructura Modular (Vertical Slices): Un módulo (`src/modules/employees`) debe ser independiente y agrupar sus propios controladores, servicios y DTOs, evitando enredarse con otros.
- Gestión de Errores: Manejo centralizado usando `Exception Filters` nativos de NestJS.

## Límites duros

_Lo que NUNCA se debe hacer. Reglas de seguridad, dependencias prohibidas, zonas congeladas._

- **Cero ORMs Pesados:** Queda TERMINANTEMENTE PROHIBIDO usar Prisma, TypeORM o similares. La interacción con la base de datos se hará mediante consultas directas vía Supabase SDK.
- **No romper el Patrón SDD:** Prohibido programar o modificar un módulo si el cambio no está documentado primero en la carpeta `spec/features/`. El diseño dicta el código.
- **Backend 100% Stateless:** El backend en NestJS no debe guardar estado local ni sesiones en memoria. Toda la validación usa JWT de Supabase, lo cual es vital para el despliegue Serverless.
- **Seguridad de Secretos:** Prohibido subir secretos (`.env`) al repositorio. Las llaves de Supabase y Google Wallet deben manejarse de manera segura por variables de entorno.
