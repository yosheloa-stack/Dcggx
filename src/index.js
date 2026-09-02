'use strict';

require('dotenv').config();

const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { initMusic } = require('./music/init');
const logger = require('./utils/logger');

// Remove espaços, quebras de linha e aspas que costumam vir de copiar/colar
// o token no painel de variáveis de ambiente (ex.: Square Cloud).
const token = (process.env.DISCORD_TOKEN || '').trim().replace(/^["']|["']$/g, '');

if (!token) {
  logger.error('DISCORD_TOKEN não definido. Copie .env.example para .env e preencha.');
  process.exit(1);
}

if (token === 'coloque_o_token_aqui') {
  logger.error('DISCORD_TOKEN ainda está com o valor de exemplo. Preencha com o token real do bot (Discord Developer Portal > Bot > Token).');
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

client.login(token).catch((err) => {
  if (err && err.code === 'TokenInvalid') {
    logger.error(
      'DISCORD_TOKEN inválido — o Discord rejeitou o token. Verifique se: ' +
        '1) o token não expirou/foi resetado no Developer Portal (Bot > Reset Token); ' +
        '2) não há espaços, quebras de linha ou aspas sobrando na variável de ambiente; ' +
        '3) você copiou o token do Bot, não o Client Secret ou Application ID.'
    );
    process.exit(1);
  }
  logger.error('Falha ao logar no Discord:', err);
  process.exit(1);
});
