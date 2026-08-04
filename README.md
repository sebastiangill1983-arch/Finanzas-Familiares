# Finanzas Familiares

App web para llevar el control mensual de ingresos y gastos familiares, inspirada en el cuaderno cuadriculado de toda la vida.

## Qué incluye este MVP

- Login / registro con email y contraseña
- Selector de mes (navegación entre meses)
- Carga de ingresos y gastos por categoría
- Marcar gastos como **Pagado / Pendiente** con un toque
- Resumen automático: total ingresos, total gastos, balance y cuánto falta pagar
- Botón "Repetir gastos fijos del mes anterior" para no volver a tipear todo cada mes
- Cada usuario ve únicamente sus propios movimientos (reglas de Firestore)

## Puesta en marcha

### 1. Crear el proyecto en Firebase
1. Andá a https://console.firebase.google.com y creá un proyecto nuevo.
2. Agregá una app web (ícono `</>`).
3. Copiá el objeto `firebaseConfig` que te muestra Firebase.
4. Pegalo en `assets/js/firebase-config.js`, reemplazando los valores `TU_...`.

### 2. Activar Authentication
En la consola de Firebase: **Authentication > Sign-in method > Email/Password > Activar**.

### 3. Activar Firestore
En la consola de Firebase: **Firestore Database > Crear base de datos** (modo producción).

Después subí las reglas de seguridad (`firestore.rules` de esta carpeta) en **Firestore Database > Reglas**, para que cada usuario solo pueda ver y editar sus propios movimientos.

### 4. Probar localmente
Abrí `index.html` con Live Server (VS Code) o cualquier servidor local. No va a funcionar abriendo el archivo directo con doble click porque los módulos de JavaScript necesitan un servidor.

### 5. Publicar (GitHub Pages)
Igual que hiciste con SinTACC:
1. Subí esta carpeta a un repo de GitHub.
2. Activá GitHub Pages desde la configuración del repo.
3. Listo, la app queda online.

## Estructura del proyecto

```
finanzas-familiares/
├── index.html              # Login / registro
├── app.html                 # Dashboard principal
├── firestore.rules          # Reglas de seguridad de Firestore
├── assets/
│   ├── css/style.css        # Estilos (tema cuaderno cuadriculado)
│   └── js/
│       ├── firebase-config.js
│       ├── auth.js          # Lógica de login/registro
│       └── app.js           # Lógica del dashboard (CRUD, resumen, repetir mes)
```

## Usar la app desde el celular

La app ahora es una **PWA (Progressive Web App)**: se puede "instalar" en el celular con su propio ícono, sin pasar por ninguna tienda de aplicaciones.

**Paso 1 — Subirla a internet.** Desde tu computadora, `127.0.0.1:5500` solo existe en tu propia máquina, así que el celular no puede acceder ahí. Subí la carpeta a GitHub Pages (mismo proceso que hiciste con SinTACC):
1. Creá un repositorio en GitHub y subí todo el contenido de esta carpeta
2. Activá GitHub Pages desde la configuración del repo (Settings > Pages > branch main)
3. Vas a tener una URL tipo `https://tu-usuario.github.io/finanzas-familiares/`

**Paso 2 — Habilitar el dominio en Firebase.** En la consola de Firebase: Authentication > Settings > Authorized domains > agregá el dominio de GitHub Pages (ej: `tu-usuario.github.io`). Sin este paso el login no va a funcionar desde esa URL.

**Paso 3 — Instalarla en el celular.**
- **Android (Chrome):** abrí la URL, tocá el menú (⋮) y elegí "Agregar a pantalla de inicio" o "Instalar app"
- **iPhone (Safari):** abrí la URL, tocá el botón de compartir (□↑) y elegí "Agregar a pantalla de inicio"

Con eso te queda un ícono como cualquier otra app, abre en pantalla completa (sin la barra del navegador) y funciona igual de bien que en la computadora.

## Ideas para las próximas versiones

- Compartir un mismo grupo familiar entre varios usuarios (hoy cada login ve solo lo suyo)
- Categorías con ícono y color fijo
- Gráfico de torta de gastos por categoría
- Exportar el resumen del mes a PDF
- Notificación de vencimientos próximos
