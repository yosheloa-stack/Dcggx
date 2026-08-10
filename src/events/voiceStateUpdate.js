'use strict';

const music = require('../music/manager');
const logger = require('../utils/logger');

/**
 * Detecta quando um ADMIN mexe na call do próprio bot:
 *  - Arrastou o bot para OUTRA call  -> atualiza o player e continua tocando lá.
 *  - Desconectou o bot da call        -> para a música e limpa a sessão.
 *
 * Sem isso, o player continua achando que está na call antiga (o painel passa
 * a barrar quem está na call nova, e a limpeza automática fica bagunçada).
 */
module.exports = {
  name: 'voiceStateUpdate',
  execute(oldState, newState, client) {
    const botId = client.user?.id;
    // Só interessa o estado de voz do PRÓPRIO bot.
    if (!botId || newState.id !== botId) return;

    // Não trocou de canal (só mutou/ensurdeceu, etc.): ignora.
    if (oldState.channelId === newState.channelId) return;

    const player = music.getPlayer(newState.guild);
    if (!player) return;

    // Bot foi DESCONECTADO da call por um admin.
    if (!newState.channelId) {
      logger.info('Bot removido da call por um admin — parando a música.');
      player.stop();
      return;
    }

    // Só reage se realmente mudou de call (evita o próprio "entrar" inicial).
    if (player.voiceChannelId && player.voiceChannelId !== newState.channelId) {
      logger.info(`Bot arrastado para outra call (${newState.channelId}) — seguindo a música.`);
      player.onMovedTo(newState.channelId);
    }
  },
};
