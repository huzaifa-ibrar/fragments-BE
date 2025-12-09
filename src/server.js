const app = require('./app');
const logger = require('./logger');
const port = process.env.PORT || 8080;
const server = app.listen(port, '0.0.0.0', () => logger.info(`Server listening on ${port}`));
module.exports = { app, server };
