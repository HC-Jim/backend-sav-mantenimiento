require('dotenv').config();
const express = require('express');
const cors = require('cors');

const mantenimientoRoutes = require('./routes/mantenimiento.routes');

const app = express();

app.use(cors());              // permite que NetBeans/otro cliente consuma la API
app.use(express.json());      // parsea cuerpos JSON

// Health check (Render lo usa para saber si el servicio esta vivo)
app.get('/', (_req, res) => {
  res.json({ ok: true, servicio: 'API Mantenimiento Preventivo', fecha: new Date().toISOString() });
});

// Rutas del proceso de mantenimiento
app.use('/api/mantenimiento', mantenimientoRoutes);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// Manejador de errores central
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Error interno' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor escuchando en el puerto ${PORT}`));
