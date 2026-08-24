# API - Gestión de Órdenes de Mantenimiento

Backend en **Node.js + Express** con arquitectura **MVC por capas + clases de dominio**.
Modelo de datos en **Supabase (PostgreSQL)**. Frontend en **Flutter** que consume esta API por HTTP.

Proceso implementado: **CUS003 – Gestionar el Mantenimiento Vehicular**.
Actores: **Jefe de Logística** y **Mecánico** (acceso por roles mediante login JWT).

---

## 1. Arquitectura (MVC + capas)

```
src/
├── config/          env.js (variables) · supabase.js (cliente único)
├── domain/          EstadoOrden.js  ← máquina de estados del BPMN + roles
├── models/          Clases de dominio: Usuario, Vehiculo, Repuesto,
│                    OrdenMantenimiento, Presupuesto
├── repositories/    Acceso a datos (Supabase) por entidad
├── services/        Lógica de negocio: auth · mantenimiento
├── controllers/     Reciben la petición HTTP y delegan al servicio
├── routes/          Definen endpoints + middleware de auth/roles
├── middlewares/     auth (JWT + roles) · manejo central de errores
├── utils/           AppError · asyncHandler · db · helpers
└── server.js        Punto de entrada (Express)
```

**Flujo de una petición:** `routes → middleware (auth/rol) → controller → service → repository → Supabase`.
El *controller* es fino; la lógica y la validación de estados viven en el *service* y en `domain/EstadoOrden`.

---

## 2. Puesta en marcha local

```bash
npm install
cp .env.example .env      # completa SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y JWT_SECRET
npm start
```

Antes: en Supabase → **SQL Editor**, ejecuta `sql/schema.sql` (crea tablas + datos de ejemplo).

Prueba: abre `http://localhost:3000/` → responde `{ "ok": true, ... }`.

**Usuarios de ejemplo (creados por el schema):**

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Jefe de Logística | `jefe@autorent.pe` | `jefe123` |
| Mecánico | `mecanico@autorent.pe` | `mecanico123` |

---

## 3. Autenticación

```
POST /api/auth/login      { "email": "...", "password": "..." }  → { token, usuario }
GET  /api/auth/me         (Bearer token)                         → perfil
```

Todas las rutas de `/api/mantenimiento` exigen la cabecera:

```
Authorization: Bearer <token>
```

El rol del token decide qué acciones se permiten (RBAC).

---

## 4. Máquina de estados de la Orden de Mantenimiento

```
PENDIENTE_INSPECCION
   └─(inspección)→ INSPECCION_COMPLETA ──(sin hallazgos)─────────────┐
                        │                                            │
                        │(genera presupuesto)                        │
                        ▼                                            │
        PENDIENTE_AUTORIZACION_PRESUPUESTO                           │
              │(jefe decide)                                         │
      ┌───────┴────────┐                                            │
      ▼                ▼                                            │
 CERRADA_POR_RECHAZO   PRESUPUESTO_AUTORIZADO ──(iniciar)──►  EN_MANTENIMIENTO ◄┘
   (final)                                                          │(finalizar + informe)
                                                                    ▼
                                                          PENDIENTE_CONFORMIDAD
                                                             │(jefe decide)
                                                     ┌───────┴────────┐
                                                     ▼                ▼
                                              CORRECCION_REQUERIDA   CERRADO (final)
                                              (vuelve al mecánico)   + Acta de Entrega
```

Alternativo: `INSPECCION_POSTERGADA` (el mecánico posterga con justificación).

La clase `domain/EstadoOrden` valida **cada** transición (estado origen válido + rol correcto)
antes de tocar la base de datos, de modo que el proceso no se pueda saltar pasos.

---

## 5. Endpoints (BPMN → ruta)

| # | Paso BPMN | Actor | Método y ruta |
|---|-----------|-------|---------------|
| — | Revisar fechas de mantenimiento | Jefe | `GET /api/mantenimiento/vehiculos/por-mantener` |
| — | Ver catálogo de repuestos | Ambos | `GET /api/mantenimiento/repuestos` |
| 1 | Crear la orden | Jefe | `POST /api/mantenimiento/ordenes` |
| 3 | Recibir / ver la orden | Mecánico | `GET /api/mantenimiento/ordenes/:ordenId` |
| 2 | Registrar inspección / hallazgos | Mecánico | `POST /api/mantenimiento/ordenes/:ordenId/inspeccion` |
| 5 | Generar requerimiento de repuestos | Mecánico | `POST /api/mantenimiento/ordenes/:ordenId/requerimientos` |
| 6 | Gestiona y compra (descuenta stock) | Jefe | `PATCH /api/mantenimiento/requerimientos/:requerimientoId/comprar` |
| 7 | Generar presupuesto (con detalle) | Mecánico | `POST /api/mantenimiento/ordenes/:ordenId/presupuesto` |
| 8 | Autorizar / rechazar presupuesto | Jefe | `PATCH /api/mantenimiento/presupuestos/:presupuestoId/decidir` |
| 9a | Iniciar mantenimiento (hora inicio) | Mecánico | `PATCH /api/mantenimiento/ordenes/:ordenId/iniciar` |
| 9b | Finalizar mantenimiento (hora fin) | Mecánico | `PATCH /api/mantenimiento/ordenes/:ordenId/finalizar` |
| 9c | Generar informe técnico | Mecánico | `POST /api/mantenimiento/ordenes/:ordenId/informe` |
| 10 | Dar conformidad y cerrar (+ Acta) / rechazar | Jefe | `PATCH /api/mantenimiento/ordenes/:ordenId/conformidad` |

Listado con filtro: `GET /api/mantenimiento/ordenes?estado=PENDIENTE_INSPECCION`

### Ejemplos de cuerpo (JSON)

**Login**
```json
{ "email": "jefe@autorent.pe", "password": "jefe123" }
```
**1. Crear OM** *(jefe_id se toma del token)*
```json
{ "vehiculo_id": 1, "mecanico_id": 2, "tipo_servicio": "Preventivo 50,000 km", "descripcion": "Cambio de aceite y filtros" }
```
**2. Inspección**
```json
{ "diagnostico": "Frenos desgastados", "resultado": "CON_HALLAZGOS", "necesita_repuestos": true,
  "kilometraje_lectura": 48200, "nivel_combustible": "1/2", "observaciones": "Ruido al frenar" }
```
**5. Requerimiento de repuestos** *(usa el catálogo con `repuesto_id`, o texto libre)*
```json
{ "items": [ { "repuesto_id": 1, "cantidad": 1 }, { "nombre": "Junta especial", "cantidad": 2, "precio_unitario": 15.0 } ] }
```
**7. Presupuesto** *(el costo de repuestos se calcula del detalle)*
```json
{ "costo_mano_obra": 80.0, "detalle": [ { "repuesto_id": 1, "cantidad": 1 }, { "repuesto_id": 3, "cantidad": 4 } ] }
```
**8. Decisión de presupuesto**
```json
{ "autorizado": true }
```
**9c. Informe técnico**
```json
{ "trabajos_realizados": "Cambio de pastillas y aceite", "repuestos_instalados": "BR-450, AC-530 x4",
  "resultados_pruebas": "OK", "observaciones": "Ninguna" }
```
**10. Conformidad** *(rechazo: `{ "conforme": false, "motivo": "..." }` → CORRECCION_REQUERIDA)*
```json
{ "conforme": true }
```

---

## 6. Consumir la API desde Flutter

```dart
// Login
final res = await http.post(
  Uri.parse('$base/api/auth/login'),
  headers: {'Content-Type': 'application/json'},
  body: jsonEncode({'email': email, 'password': password}),
);
final token = jsonDecode(res.body)['token'];

// Llamada autenticada
final ordenes = await http.get(
  Uri.parse('$base/api/mantenimiento/ordenes'),
  headers: {'Authorization': 'Bearer $token'},
);
```

> El backend nunca expone la `SERVICE_ROLE_KEY`: vive solo aquí. Flutter solo habla con esta API.

---

## 7. Despliegue en Render

1. Sube el repo a GitHub.
2. En [render.com](https://render.com) → **New → Web Service** → conecta el repo.
3. **Build:** `npm install` · **Start:** `npm start`
4. Variables de entorno: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`
   (Render define `PORT` automáticamente).

> El plan gratis "duerme" el servicio tras ~15 min de inactividad; la primera
> petición luego tarda unos segundos.
