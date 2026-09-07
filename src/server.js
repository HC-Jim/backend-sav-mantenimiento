const express = require('express');
const cors = require('cors');

const { env, validar } = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const mantenimientoRoutes = require('./routes/mantenimiento.routes');
const reservaRoutes = require('./routes/reserva.routes');
const gestionRoutes = require('./routes/gestion.routes');
const { errorHandler, notFound } = require('./middlewares/error.middleware');

// Falla temprano si falta configuracion critica.
validar();

const app = express();

app.use(cors());          // permite que el frontend Flutter consuma la API
app.use(express.json());  // parsea cuerpos JSON

// Health check (Render lo usa para saber si el servicio esta vivo)
app.get('/', (_req, res) => {
  res.json({
    ok: true,
    servicio: 'API - Gestion de Ordenes de Mantenimiento',
    fecha: new Date().toISOString()
  });
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/mantenimiento', mantenimientoRoutes);
app.use('/api/alquiler', reservaRoutes);
app.use('/api/gestion', gestionRoutes);

// 404 y manejador de errores (siempre al final)
app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => console.log(`Servidor escuchando en el puerto ${env.port}`));

module.exports = app;
