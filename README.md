# SAV — API del Sistema de Alquiler de Vehículos (AutoRent Perú)

Backend en **Node.js + Express** con arquitectura **MVC por capas + clases de dominio**.
Datos en **Supabase (PostgreSQL)**. Autenticación **JWT** con control por **roles**.
Lo consume el frontend **Flutter** (`sav_frontend`) por HTTP.

Módulos implementados: **Ventas/Cotización · Reservas y Pagos · Gestión (flota, precios, clientes, seguros) · Mantenimiento**.

---

## 1. Stack

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js + Express |
| Base de datos | Supabase (PostgreSQL) |
| Auth | JWT (Bearer) + roles (RBAC) |
| Despliegue | Render (Web Service) |

---

## 2. Arquitectura (MVC + capas)

```
src/
├── config/          env.js (variables) · supabase.js (cliente único)
├── domain/          Reglas y máquinas de estado + roles
│                    ├── EstadoOrden.js       (mantenimiento) + Rol
│                    ├── EstadoReserva.js      (reserva de alquiler)
│                    ├── EstadoCotizacion.js   (cotización)
│                    └── PoliticasAlquiler.js  (garantía, penalidad 48h)
├── models/          Clases de dominio (Usuario, Vehiculo, Reserva, ...)
├── repositories/    Acceso a datos (Supabase) por entidad
├── services/        Lógica de negocio (ver §7 reutilizables «include»)
├── controllers/     Reciben la petición HTTP y delegan al service
├── routes/          Endpoints + middleware de auth/roles
├── middlewares/     auth (JWT + roles) · manejo central de errores
├── utils/           AppError · asyncHandler · db · helpers
└── server.js        Punto de entrada (Express) + montaje de rutas
```

**Flujo de una petición:** `routes → middleware (auth/rol) → controller → service → repository → Supabase`.
El *controller* es fino; la lógica y la validación de estados viven en el *service* y en `domain/`.

**Rutas montadas** (`server.js`):

| Prefijo | Módulo |
|---------|--------|
| `/api/auth` | Login / perfil |
| `/api/ventas` | Cotización (Asesor / Cliente) |
| `/api/alquiler` | Reservas, pagos, caja (Cliente / Cajero) |
| `/api/gestion` | Flota, precios, clientes, seguros (Administrador / Asesor) |
| `/api/mantenimiento` | Órdenes de mantenimiento (Jefe / Mecánico) |

---

## 3. Puesta en marcha local

```bash
npm install
cp .env.example .env      # completa SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y JWT_SECRET
npm start
```

Antes, en Supabase → **SQL Editor**, ejecuta `sql/schema.sql` (crea tablas + datos de ejemplo).
Migraciones incrementales (no borran datos): `sql/add_roles.sql`, `sql/add_cotizacion.sql`, `sql/add_precios_v2.sql`.

Prueba: `http://localhost:3000/` → responde `{ "ok": true, ... }`.

### Usuarios de ejemplo (seed)

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Cliente | `carla@autorent.pe` | `cliente123` |
| Asesor de Ventas | `asesor@autorent.pe` | `asesor123` |
| Cajero | `cajero@autorent.pe` | `cajero123` |
| Jefe de Logística | `jefe@autorent.pe` | `jefe123` |
| Mecánico | `mecanico@autorent.pe` | `mecanico123` |
| Administrador | `admin@autorent.pe` | `admin123` |

---

## 4. Autenticación

```
POST /api/auth/login    { "email": "...", "password": "..." }   → { token, usuario }
GET  /api/auth/me       (Bearer token)                          → perfil
```

Todas las rutas (salvo `login`) requieren la cabecera:

```
Authorization: Bearer <token>
```

**Ejemplo de consumo (curl):**

```bash
# 1) login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cajero@autorent.pe","password":"cajero123"}' | jq -r .token)

# 2) usar el token
curl http://localhost:3000/api/alquiler/reservas/todas \
  -H "Authorization: Bearer $TOKEN"
```

---

## 5. Endpoints por módulo

> Notación: **método** `ruta` — *rol(es) permitidos* — descripción.

### 5.1 Ventas / Cotización · `/api/ventas`

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| POST | `/cotizaciones` | Asesor | Generar cotización (busca vehículo/cliente y calcula tarifa) |
| GET | `/cotizaciones/todas` | Asesor, Jefe | Listar cotizaciones |
| POST | `/cotizaciones/:id/solicitar-garantia` | Asesor | Solicitar garantía al cliente |
| POST | `/cotizaciones/:id/generar-reserva` | Asesor | Generar la orden de reserva |
| GET | `/cotizaciones/mias` | Cliente | Mis cotizaciones |
| PATCH | `/cotizaciones/:id/decidir` | Cliente | Aceptar / rechazar cotización — `{ "decision": "ACEPTAR" \| "RECHAZAR" }` |
| PATCH | `/cotizaciones/:id/pagar-garantia` | Cliente | Pagar garantía → confirma la reserva |

### 5.2 Reservas y Pagos · `/api/alquiler`

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/vehiculos` | autenticado | Catálogo (`?todos=true` incluye no disponibles) |
| GET | `/vehiculos/:vehiculoId` | autenticado | Detalle de vehículo |
| GET | `/disponibilidad` | autenticado | `?vehiculo_id=&fecha_inicio=&fecha_fin=` |
| GET | `/reservas/todas` | Jefe, Cajero, Asesor | Todas las reservas |
| GET | `/reservas/mias` | Cliente | Mis reservas |
| GET | `/reservas/:reservaId` | autenticado | Ver una reserva |
| PATCH | `/reservas/:reservaId/pagar-alquiler` | Cliente, Cajero | Pagar alquiler → `EN_CURSO` — `{ "metodo": "TARJETA" }` |
| PATCH | `/reservas/:reservaId/cancelar` | Cliente, Cajero | Cancelar (regla 48h) — `{ "motivo": "..." }` |

**Caja (Cajero) — funciones de ventanilla:**

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| PATCH | `/reservas/:reservaId/devolver-garantia` | Cajero | Devolver garantía → `FINALIZADA` — `{ "deducciones": 0, "metodo": "TARJETA" }` (precond.: garantía pagada) |
| PATCH | `/reservas/:reservaId/gestionar-cancelacion` | Cajero | Gestionar cancelación en ventanilla (regla 48h) — `{ "motivo": "..." }` |
| POST | `/reservas/:reservaId/emitir-comprobante` | Cajero | Emitir el comprobante del pago de alquiler |
| GET | `/reservas/:reservaId/comprobantes` | Cajero | Listar comprobantes de la reserva |

### 5.3 Gestión · `/api/gestion`

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET/POST | `/vehiculos` | Administrador | Listar / crear vehículo |
| PATCH | `/vehiculos/:id` | Administrador | Editar datos del vehículo |
| PATCH | `/vehiculos/:id/precio` | Administrador | Registrar lista de precios (regular/normal/campaña) |
| DELETE | `/vehiculos/:id` | Administrador | Eliminar vehículo |
| GET/POST | `/clientes` | Asesor, Administrador | Listar / crear cliente |
| PATCH/DELETE | `/clientes/:id` | Asesor, Administrador | Editar / eliminar cliente |
| GET | `/seguros` | Administrador | Listar seguros |
| GET | `/seguros/por-vencer` | Administrador | Alerta de seguros por vencer (≤30 días) |
| POST | `/seguros` | Administrador | Registrar seguro |
| POST | `/seguros/:id/renovar` | Administrador | Renovar seguro |
| PATCH/DELETE | `/seguros/:id` | Administrador | Editar / eliminar seguro |

### 5.4 Mantenimiento · `/api/mantenimiento`

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| GET | `/ordenes` | autenticado | Listar órdenes (`?estado=`) |
| GET | `/ordenes/:ordenId` | autenticado | Ver orden (el Mecánico "recibe" la OM) |
| GET | `/ordenes/:ordenId/documentos-costos` | autenticado | «include» Generar Documentos de Costos |
| GET | `/vehiculos/por-mantener` | autenticado | Vehículos por mantener |
| GET | `/repuestos` | autenticado | Catálogo de repuestos |
| GET | `/mecanicos` | Jefe | Mecánicos (para asignar OM) |
| POST | `/ordenes` | Jefe | Registrar orden de mantenimiento |
| PATCH | `/requerimientos/:id/comprar` | Jefe | Comprar repuestos del requerimiento |
| PATCH | `/presupuestos/:id/decidir` | Jefe | Autorizar / rechazar presupuesto |
| PATCH | `/ordenes/:ordenId/conformidad` | Jefe | Cerrar conformidad |
| POST | `/ordenes/:ordenId/inspeccion` | Mecánico | Registrar inspección / hallazgos |
| POST | `/ordenes/:ordenId/requerimientos` | Mecánico | Crear requerimiento de repuestos |
| POST | `/ordenes/:ordenId/presupuesto` | Mecánico | Generar presupuesto |
| PATCH | `/ordenes/:ordenId/iniciar` | Mecánico | Iniciar (ejecutar) mantenimiento |
| PATCH | `/ordenes/:ordenId/finalizar` | Mecánico | Finalizar mantenimiento |
| POST | `/ordenes/:ordenId/informe` | Mecánico | Generar informe técnico |

---

## 6. Máquinas de estado

**Reserva** (`domain/EstadoReserva.js`):

```
PENDIENTE_PAGO_GARANTIA --(pagar garantía · Cliente)--> CONFIRMADA
CONFIRMADA              --(pagar alquiler · Cliente/Cajero)--> EN_CURSO
EN_CURSO               --(devolver garantía · Cajero)--> FINALIZADA
CONFIRMADA / EN_CURSO  --(cancelar / gestionar cancelación)--> CANCELADA
```

> Nota: `pagar-alquiler` deja la reserva **EN_CURSO** (ya no devuelve la garantía en automático).
> La garantía la devuelve el **Cajero** con `devolver-garantia`, cerrando el ciclo.

**Cotización** (`domain/EstadoCotizacion.js`) y **Orden de Mantenimiento** (`domain/EstadoOrden.js`)
siguen el mismo patrón de transiciones validadas.

---

## 7. Casos de uso reutilizables («include»)

Servicios compartidos que otros casos de uso invocan siempre como sub-paso:

| Servicio | Caso de uso | Lo incluyen |
|----------|-------------|-------------|
| `busqueda.service` | Buscar Vehículo / Buscar Cliente | Cotización, Reserva, Mantenimiento, Gestión |
| `comprobante.service` | Emitir Comprobante | Pagar Garantía, Pagar Alquiler, Devolver Garantía, Cancelar / Gestionar Cancelación |
| `documentosCosto.service` | Generar Documentos de Costos | Presupuesto, Informe, Autorizar Presupuesto |

---

## 8. Despliegue (Render)

- **Web Service** conectado al repo. Variables de entorno: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`.
- Cada `git push` a `main` dispara el redeploy automático.
- URL de producción: `https://backend-sav-mantenimiento.onrender.com`.
