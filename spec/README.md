# spec/ — Spec Driven Development (Inefable Wallet Backend)

> Este directorio es el corazón y cerebro del proyecto Inefable Wallet. 
> Todo el desarrollo sigue estrictamente la metodología **Spec-Driven Development (SDD)**: primero se especifica el problema, luego se planea la arquitectura técnica, luego se listan las tareas, y **solo entonces se escribe código**.

## Estructura

```text
/inefable-backend2
│
├── 🤖 CAPA DE IA Y ESPECIFICACIONES (Spec Driven Development)
│   ├── .agents/
│   │   ├── skills/              ← Herramientas extra para los agentes IA
│   │   └── AGENTS.md            ← Constitución de comportamiento para la IA
│   │
│   └── spec/
│       ├── constitution/        ← Las Reglas Inmutables
│       │   ├── mission.md       ← Qué construimos y para quién
│       │   ├── tech-stack.md    ← Stack técnico (NestJS, Supabase, Cero ORMs)
│       │   └── roadmap.md       ← Orden cronológico de los módulos
│       │
│       └── features/            ← Documentación granular de cada módulo
│           ├── 001-auth/
│           ├── 002-merchants/
│           ├── 003-employees/
│           ├── 004-loyalty-passes/
│           ├── 005-loyalty-engine/
│           └── 006-analytics/
│               ├── spec.md      ← Reglas de negocio y criterios de aceptación
│               ├── plan.md      ← Enfoque técnico (endpoints, Guards)
│               └── tasks.md     ← Checklist de tareas accionables
│
├── ⚙️ CAPA DE CONFIGURACIÓN
│   ├── .env                     ← Secretos y URL de Supavisor (puerto 6543)
│   ├── package.json
│   └── tsconfig.json
│
└── 💻 CAPA DE CÓDIGO FUENTE (src/)
    │
    ├── core/                    ← Capa de Seguridad (El escudo)
    │   ├── guards/              ← Validaciones IP, GPS, Horarios
    │   └── filters/             ← Manejo de errores globales
    │
    ├── infrastructure/          ← Conexiones Externas
    │   ├── supabase/            ← Conexión directa a BD y Auth
    │   └── google-wallet/       ← Emisión de pases
    │
    └── modules/                 ← Dominios de Negocio (Espejos de spec/features/)
        ├── auth/
        ├── merchants/
        ├── employees/
        ├── wallet-passes/
        ├── loyalty-engine/
        └── analytics/
```

## Flujo Inquebrantable para Cualquier Módulo

1. **Seleccionar Módulo:** Elegir el siguiente módulo disponible en `constitution/roadmap.md`.
2. **Definir Negocio (`spec.md`):** Escribir qué hace el módulo, por qué se necesita (roles implicados) y definir sus criterios de aceptación medibles.
3. **Planear Técnico (`plan.md`):** Documentar el enfoque técnico (Guards, DTOs, consultas directas al SDK de Supabase) respetando las prohibiciones definidas en `constitution/tech-stack.md`.
4. **Dividir Tareas (`tasks.md`):** Desglosar el plan técnico en un checklist y usarlo para rastrear el progreso.
5. **Implementar y Validar:** Programar el código dentro de `src/modules/` y correr la compilación (`npm run build`).
6. **Actualizar Roadmap:** Mover el módulo de "Siguiente" a "Hecho" en `constitution/roadmap.md`.

> **⚠️ REGLA DE ORO:** La constitución manda. Si el desarrollo de un módulo entra en conflicto con `mission.md` o `tech-stack.md` (por ejemplo, requiere usar Prisma, o debilita la seguridad del cajero), se replantea el módulo, no la constitución.
