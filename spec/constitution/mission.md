# Misión

Nuestra misión es democratizar la tecnología de fidelización para los pequeños y medianos negocios, ofreciéndoles un sistema seguro, económico y libre de fricción. Buscamos eliminar para siempre las ineficientes tarjetas de cartón y proteger el dinero de los dueños mediante un sistema antifraude inquebrantable basado en pases digitales.

## Qué construimos

Construimos un motor de fidelización (Loyalty Program) B2B2C enfocado en la seguridad del negocio y la cero fricción para el usuario. Resuelve el problema del fraude en los programas de lealtad físicos y elimina la barrera de obligar a los clientes a descargar aplicaciones móviles pesadas.

1. **Dashboard Web Administrativo** — Permite al dueño (Merchant) crear y configurar su programa de lealtad, diseñar su pase y ver métricas.
2. **Scanner PWA (Aplicación Web Progresiva)** — Interfaz súper ligera para que los cajeros (Employees) escaneen los QRs de los clientes y otorguen sellos de forma segura y auditada.
3. **Motor Anti-Fraude Backend** — El núcleo del sistema que valida cada petición de sello mediante reglas estrictas (IP, geolocalización, intervalos de tiempo) para proteger al negocio.

## Para quién

- **Dueño del Negocio (Merchant):** Busca una herramienta moderna, barata y sin fricción para fidelizar a sus clientes sin imprimir cartón.
- **Cajero (Employee):** Busca una herramienta rápida y fácil de usar en su celular (PWA) para despachar rápido.
- **Cliente Final (Customer):** Busca acumular sellos y premios sin tener que descargar otra app móvil que sature su teléfono.
- **Administrador del Sistema (Inefable):** Nosotros, que buscamos operar la plataforma globalmente con costos de infraestructura mínimos.

## Principios

- **Eficiencia y Simplicidad Técnica** — Descartamos ORMs pesados e infraestructuras complejas. Usamos el ecosistema nativo de Supabase y NestJS (sobre Fastify) para que sea veloz y barato de alojar.
- **Seguridad Paranoica (Auditoría del Cajero)** — Los sellos equivalen a dinero del negocio. Toda transacción debe estar auditada bajo un `employee_id` y pasar por "Guards" antifraude en el backend.
- **Cero Barreras de Entrada (Fricción Cero)** — No obligamos a descargar apps nativas. Todo el flujo sucede a través de PWAs y pases de Google Wallet.
- **Spec-Driven Development** — El diseño de software dicta el código. Ninguna característica se programa sin antes haber sido especificada y documentada en esta carpeta.

## Qué NO es

- **NO es una aplicación para Apple Wallet** (El desarrollo para Apple fue descartado por barreras de costos de licencias; es un producto centrado 100% en Google Wallet).
- **NO incluye aplicaciones móviles nativas iOS/Android para descarga** (La interacción del cajero se realiza exclusivamente vía PWA web).
- **NO es un sistema genérico de puntos** (Es un sistema enfocado en la validación de eventos en el mundo físico y la protección contra el fraude en la emisión de los sellos).
