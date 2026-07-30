# Inefable Wallet — Backend

API en NestJS para **Inefable Wallet**, un sistema de fidelización (tarjetas de sellos) que conecta negocios (merchants) con sus clientes finales a través de pases de Google Wallet, con antifraude híbrido (IP + geocerca) para el escaneo de sellos.

## Stack

- **Runtime:** Node.js + [NestJS](https://nestjs.com/) 11 sobre **Fastify** (no Express)
- **Lenguaje:** TypeScript estricto (`strictNullChecks`, sin `noImplicitAny`)
- **Base de datos / Auth:** [Supabase](https://supabase.com/) (PostgreSQL + Auth delegada), vía `@supabase/supabase-js` con Service Role Key
- **Wallet:** Google Wallet API (`google-auth-library` + JWT firmado con `jsonwebtoken`)
- **Validación:** `class-validator` / `class-transformer` (DTOs en cada endpoint)
- **Rate limiting:** `@nestjs/throttler` (global)
- **Docs de API:** `@nestjs/swagger`, expuesta en `/api/docs` solo fuera de `production`
- **Tests:** Jest

> Tecnologías explícitamente **prohibidas** en este proyecto: Prisma, Redis, colas locales (BullMQ), JWT/bcrypt manual para sesiones de usuario final — todo eso lo delega el proyecto a Supabase. Ver [`AGENTS.md`](./AGENTS.md).

## Arquitectura

Organización por *feature slices* (`src/modules/*`), con una capa `core/` (guards, decoradores) y `infrastructure/` (clientes externos) compartidas:

```
src/
├── core/
│   ├── decorators/       # @CurrentUser()
│   └── guards/           # SupabaseAuthGuard (dueños), CashierAuthGuard (cajeros)
├── infrastructure/
│   └── supabase/         # SupabaseService (cliente global), AuditLogService, database.types.ts
└── modules/
    ├── auth/              # GET /auth/me
    ├── merchants/         # Perfil del negocio + configuración antifraude
    ├── employees/         # Alta/baja de cajeros, login por PIN
    ├── wallet-passes/      # Diseño del pase + emisión de tarjetas Google Wallet
    ├── loyalty-engine/     # Configuración del programa de lealtad (GET/PATCH /loyalty-engine/config)
    ├── analytics/          # KPIs, ranking de cajeros, actividad reciente
    ├── customers/          # Registro público de clientes finales (QR)
    ├── scanner/            # Flujo real del cajero: dar sello y canjear premio
    └── admin/              # Panel Super Admin de Inefable: control global de negocios
```

Reglas no negociables (más detalle en [`AGENTS.md`](./AGENTS.md) y [`docs/`](./docs)):

1. **Multi-tenant:** toda query a Supabase se filtra por `business_id`.
2. **Antifraude en `scanner`:** `POST /scanner/stamp` valida IP y/o geocerca (fórmula de Haversine) según `businesses.anti_fraud_mode` antes de otorgar un sello.
3. **Las llaves de Google Wallet nunca se exponen** — solo viven en variables de entorno, leídas dentro del service de `wallet-passes`.
4. **El único flujo de escaneo en producción es `scanner`:** `POST /scanner/stamp` (dar sello) y `POST /scanner/redeem` (canjear premio), ambos autenticados con el JWT del cajero (`CashierAuthGuard`). El endpoint `loyalty-engine/scan` que existió durante el desarrollo temprano (pruebas desde el dashboard del dueño) se eliminó — confirmado que el frontend nunca lo consumió.
5. **El login de cajero exige horario configurado:** `POST /employees/login` rechaza a cualquier cajero sin `shift_start`/`shift_end` asignados (`PATCH /employees/:id/schedule`, solo el dueño), y también fuera de su horario. El JWT resultante expira exactamente al final del turno (no 12h fijas), calculado en la zona horaria del negocio (`businesses.timezone`).

## Requisitos

- Node.js 20+
- Un proyecto de Supabase (URL + Service Role Key)
- Credenciales de una Service Account de Google Wallet (Issuer ID, Class ID, email y llave privada)

## Instalación

```bash
npm install
```

Crea un archivo `.env` en la raíz con:

```env
PORT=3000

# Supabase
SUPABASE_URL="https://[tu-proyecto].supabase.co"
SUPABASE_KEY="eyJhbG..."              # Service Role Key
SUPABASE_JWT_SECRET="..."             # Usado para firmar/validar el JWT propio de los cajeros
SUPER_ADMIN_USER_ID="..."             # auth.users.id del Super Admin de Inefable (panel /admin)

# Google Wallet
GOOGLE_WALLET_ISSUER_ID="..."
GOOGLE_WALLET_CLASS_ID="..."
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL="...@...iam.gserviceaccount.com"
GOOGLE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> El esquema completo de la base de datos (tablas, columnas, relaciones) está documentado en [`docs/database-schema.md`](./docs/database-schema.md).

## Comandos

```bash
npm run start:dev    # servidor local con recarga automática
npm run build        # compila a dist/ (nest build)
npm run start:prod    # corre el build compilado

npm run lint          # ESLint + Prettier (--fix)
npm run test          # tests unitarios (Jest)
npm run test:e2e      # tests end-to-end
npm run test:cov      # cobertura
```

Con el servidor corriendo en desarrollo, la documentación interactiva de la API está en `http://localhost:3000/api/docs`.

## Convenciones

- `camelCase` para variables/métodos, `PascalCase` para clases/DTOs/interfaces.
- Los tests viven al lado del archivo que prueban (`x.service.ts` → `x.service.spec.ts`).
- Toda entrada de usuario se valida con DTOs + `class-validator`; los controladores solo enrutan, la lógica va en los Services.
- Antes de una tarea no trivial: proponer un plan y esperar OK (ver [`AGENTS.md`](./AGENTS.md) para el flujo de trabajo completo).

## Documentación adicional

- [`AGENTS.md`](./AGENTS.md) — reglas de trabajo, prohibiciones y convenciones del proyecto.
- [`docs/`](./docs) — esquema de base de datos y memoria técnica por feature (auth, merchants, employees, wallet-passes, loyalty-engine, analytics, antifraude).
- [`spec/`](./spec) — constitución del proyecto (misión, stack, roadmap) y specs/plans/tasks originales por feature.
