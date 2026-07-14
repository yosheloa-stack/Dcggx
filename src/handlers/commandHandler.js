'use strict';

const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const logger = require('../utils/logger');

/** Carrega todos os comandos de src/commands para client.commands. */
function loadCommands(client) {
  client.commands = new Collection();
  const dir = path.join(__dirname, '..', 'commands');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const command = require(path.join(dir, file));
    if (!command.data || !command.execute) {
      logger.warn(`Comando "${file}" ignorado (sem data/execute).`);
      continue;
    }
    client.commands.set(command.data.name, command);
  }

  logger.ok(`${client.commands.size} comando(s) carregado(s).`);
  return client.commands;
}

module.exports = { loadCommands };
