'use strict';

const { Events } = require('discord.js');
const store = require('../utils/store');
const logger = require('../utils/logger');

/** Ao entrar em um servidor novo, já cria as configurações padrão. */
module.exports = {
  name: Events.GuildCreate,
  execute(guild) {
    store.getGuild(guild.id); // força a criação do registro
    logger.info(`Entrou no servidor: ${guild.name} (${guild.id})`);
  },
};
