// fragment_backend/src/app.js (Example structure)
const express = require('express');
const app = express();
// const authMiddleware = require('./auth/auth-middleware'); // (If you use a file like this)
const fragmentsRouter = require('./routes/fragments'); // Your fragment routes

// --- CRITICAL FIX: ALB Health Check Route ---
// This must be placed *before* any authentication middleware or specific route handlers.
app.get('/', (req, res) => {
    // Returning 200 OK status indicates the Node.js process is alive and responsive.
    res.status(200).json({ status: 'ok', service: 'fragments-api' });
}); 
// ---------------------------------------------


// Example of mounting middleware and routes:
// app.use(authMiddleware); // Authentication middleware would come AFTER the health check
app.use('/v1/fragments', fragmentsRouter);
// ...

module.exports = app;