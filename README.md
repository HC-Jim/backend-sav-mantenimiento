# API - Proceso de Mantenimiento Preventivo

Backend (Controlador MVC) en **Node.js + Express**. Modelo en **Supabase (PostgreSQL)**.
Vista en **Apache NetBeans (Java)** que consume esta API por HTTP.

Actores del proceso: **Jefe de Logística** y **Mecánico**.

---

## 1. Puesta en marcha local

```bash
npm install
cp .env.example .env      # completa SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
npm start
```

Antes: en Supabase → **SQL Editor**, ejecuta `sql/schema.sql` para crear las tablas.

Prueba: abre `http://localhost:3000/` → debe responder `{ "ok": true, ... }`.

---

## 2. Flujo BPMN → Endpoints

El estado de la **Orden de Mantenimiento (OM)** avanza automáticamente en cada paso:

```
CREADA → INSPECCIONADA → PRESUPUESTO_GENERADO
       → AUTORIZADA | RECHAZADA
       → INFORME_GENERADO → CERRADA → ENTREGADA
```

| # | Paso BPMN | Actor | Método y ruta |
|---|-----------|-------|---------------|
| 1 | Revisar fechas de mantenimiento | Jefe | `GET /api/mantenimiento/vehiculos/por-mantener` |
| 2 | Crea la orden de mantenimiento | Jefe | `POST /api/mantenimiento/ordenes` |
| 3 | Recibe la orden | Mecánico | `GET /api/mantenimiento/ordenes/:ordenId` |
| 4 | Realiza la inspección | Mecánico | `POST /api/mantenimiento/ordenes/:ordenId/inspeccion` |
| 5 | Genera requerimiento de repuestos *(si aplica)* | Mecánico | `POST /api/mantenimiento/ordenes/:ordenId/requerimientos` |
| 6 | Gestiona y compra | Jefe | `PATCH /api/mantenimiento/requerimientos/:requerimientoId/comprar` |
| 7 | Genera el presupuesto | Mecánico | `POST /api/mantenimiento/ordenes/:ordenId/presupuesto` |
| 8 | Revisa y autoriza / rechaza presupuesto | Jefe | `PATCH /api/mantenimiento/presupuestos/:presupuestoId/decidir` |
| 9 | Genera el informe técnico *(tras mantenimiento + pruebas)* | Mecánico | `POST /api/mantenimiento/ordenes/:ordenId/informe` |
| 10 | Da conformidad y cierra la orden | Jefe | `PATCH /api/mantenimiento/ordenes/:ordenId/cerrar` |
| 11 | Entrega el vehículo | Jefe | `PATCH /api/mantenimiento/ordenes/:ordenId/entregar` |

Listado general con filtro opcional: `GET /api/mantenimiento/ordenes?estado=CREADA`

### Ejemplos de cuerpo (JSON)

**2. Crear OM**
```json
{ "vehiculo_id": 1, "jefe_logistica": "Ana Ruiz", "mecanico": "Luis Paz",
  "tipo_servicio": "Preventivo 50,000 km", "descripcion": "Cambio de aceite y filtros" }
```
**4. Inspección**
```json
{ "diagnostico": "Frenos desgastados", "necesita_repuestos": true,
  "hora_inicio": "2026-08-22T09:00:00Z", "hora_fin": "2026-08-22T09:40:00Z" }
```
**5. Requerimiento de repuestos**
```json
{ "items": [ { "nombre": "Pastillas de freno", "referencia": "BR-450", "cantidad": 1, "precio_unitario": 120.0 } ] }
```
**7. Presupuesto**
```json
{ "costo_repuestos": 120.0, "costo_mano_obra": 80.0 }
```
**8. Decisión de presupuesto**
```json
{ "autorizado": true }
```
**9. Informe técnico**
```json
{ "trabajos_realizados": "Cambio de pastillas", "repuestos_instalados": "Pastillas BR-450",
  "resultados_pruebas": "OK", "observaciones": "Ninguna" }
```

---

## 3. Consumir la API desde NetBeans (Java 11+)

```java
import java.net.URI;
import java.net.http.*;

public class MantenimientoAPI {
    private static final String BASE = "http://localhost:3000/api/mantenimiento";
    private final HttpClient http = HttpClient.newHttpClient();

    // Ejemplo: crear una Orden de Mantenimiento
    public String crearOrden(int vehiculoId, String jefe, String tipoServicio) throws Exception {
        String json = """
            { "vehiculo_id": %d, "jefe_logistica": "%s", "tipo_servicio": "%s" }
            """.formatted(vehiculoId, jefe, tipoServicio);

        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(BASE + "/ordenes"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();

        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        return res.body(); // luego parsea con Gson/Jackson
    }

    // Ejemplo GET: vehículos que requieren mantenimiento
    public String vehiculosPorMantener() throws Exception {
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create(BASE + "/vehiculos/por-mantener"))
            .GET().build();
        return http.send(req, HttpResponse.BodyHandlers.ofString()).body();
    }
}
```

Para parsear el JSON recomiendo **Gson** (`com.google.code.gson`) o **Jackson**.
En producción, cambia `BASE` por la URL de Render (ver abajo).

> **Importante:** NetBeans nunca habla con Supabase directamente. Solo llama a esta API.
> La `SERVICE_ROLE_KEY` vive **solo** en el backend.

---

## 4. Despliegue en Render (gratis)

1. Sube este proyecto a un repo de GitHub.
2. En [render.com](https://render.com) → **New → Web Service** → conecta el repo.
3. Configuración:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Environment:** agrega `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
     (Render define `PORT` automáticamente; el código ya lo usa).
4. Deploy. Tu API quedará en `https://tu-servicio.onrender.com`.

> El plan gratis "duerme" el servicio tras ~15 min de inactividad; la primera
> petición luego de dormir tarda unos segundos en responder.
