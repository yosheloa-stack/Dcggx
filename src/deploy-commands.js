'use strict';

/**
 * Registra os slash commands no Discord.
 *
 *   npm run deploy
 *
 * Se GUILD_ID estiver definido no .env, registra apenas nesse servidor
 * (aparece na hora — ideal para testes). Caso contrário, registra
 * globalmente (pode levar até 1 hora para propagar).
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const logger = require('./utils/logger');

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID) {
  logger.error('DISCORD_TOKEN e CLIENT_ID são obrigatórios no .env.');
  process.exit(1);
}

const commands = [];
const dir = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(dir, file));
  if (command.data) commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    logger.info(`Registrando ${commands.length} comando(s)...`);
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      logger.ok(`Comandos registrados no servidor ${GUILD_ID}.`);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      logger.ok('Comandos registrados globalmente (pode levar até 1h).');
    }
  } catch (err) {
    logger.error('Falha ao registrar comandos:', err);
    process.exit(1);
  }
})();
