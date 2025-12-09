require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/error-handler');

const app = express();

// Parse JSON + URL-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS before routes
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://localhost', 'http://127.0.0.1'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Health check - Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Health check - Detailed endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
app.use('/v1', routes);

// Error handler — last!
app.use(errorHandler);

module.exports = app;
