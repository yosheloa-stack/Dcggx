'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/** Registra todos os eventos de src/events no client. */
function loadEvents(client) {
  const dir = path.join(__dirname, '..', 'events');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const event = require(path.join(dir, file));
    if (!event.name || !event.execute) {
      logger.warn(`Evento "${file}" ignorado (sem name/execute).`);
      continue;
    }
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }

  logger.ok(`${files.length} evento(s) carregado(s).`);
}

module.exports = { loadEvents };
