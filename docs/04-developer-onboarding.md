# Guía de Instalación para Desarrolladores (Onboarding)

Este documento explica los pasos exactos que cualquier desarrollador debe seguir tras clonar el repositorio de **Inefable Backend** para poder correr el proyecto en su máquina local. 

Dado que por seguridad **nunca** subimos archivos confidenciales a GitHub (como `.env` o `node_modules`), el proyecto recién clonado estará incompleto hasta que se sigan estos pasos.

---

## Paso 1: Instalar las dependencias (La "carpeta pesada")

El repositorio solo incluye el archivo `package.json`, que es la "receta" de las librerías necesarias. Para descargar la carpeta `node_modules` con todo el código de NestJS, Supabase y Google, ejecuta en tu terminal:

```bash
npm install
```

## Paso 2: Configurar las Variables de Entorno (Las "Llaves Maestras")

El archivo `.env` original fue ignorado por Git para proteger las claves de producción. Si intentas arrancar el servidor ahora mismo, NestJS fallará al intentar conectarse a Supabase o a Google Wallet.

1. En la raíz del proyecto, crea un archivo llamado exactamente `.env`.
2. Pídele al administrador del proyecto (Dueño) que te proporcione las credenciales de desarrollo, o usa las tuyas si estás configurando un entorno de pruebas.
3. El archivo `.env` debe tener estrictamente esta estructura:

```env
# ==========================================
# SUPABASE (Base de Datos y Autenticación)
# ==========================================
SUPABASE_URL="https://[TU-PROYECTO].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbG..."

# ==========================================
# GOOGLE WALLET API (Emisión de Tarjetas)
# ==========================================
GOOGLE_WALLET_ISSUER_ID="3388000000000000000"
GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL="tu-cuenta@tu-proyecto.iam.gserviceaccount.com"
# IMPORTANTE: Reemplaza los saltos de línea reales con \n en una sola línea
GOOGLE_WALLET_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEv...=\n-----END PRIVATE KEY-----\n"
```

> **Aviso de Seguridad:** Jamás hagas "commit" ni subas tu archivo `.env` personal al repositorio.

## Paso 3: Levantar el Servidor Local

Una vez que tengas las dependencias instaladas y el `.env` configurado, puedes iniciar el servidor en modo desarrollo:

```bash
npm run start:dev
```

Si todo está correcto, deberías ver en tu consola mensajes verdes de NestJS indicando que los módulos (Auth, Merchants, Loyalty Engine, Analytics, etc.) se han inicializado correctamente y que el servidor está escuchando en el puerto 3000.
