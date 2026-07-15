'use strict';

require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { initMusic } = require('./music/init');
const logger = require('./utils/logger');

if (!process.env.DISCORD_TOKEN) {
  logger.error('DISCORD_TOKEN não definido. Copie .env.example para .env e preencha.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.Message],
});

loadCommands(client);
loadEvents(client);
initMusic();

// Rede de segurança contra erros não tratados
process.on('unhandledRejection', (err) => logger.error('Rejeição não tratada:', err));
process.on('uncaughtException', (err) => logger.error('Exceção não capturada:', err));

client.login(process.env.DISCORD_TOKEN);
