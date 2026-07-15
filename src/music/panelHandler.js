'use strict';

const { MessageFlags } = require('discord.js');
const music = require('./manager');
const embeds = require('../utils/embeds');
const logger = require('./../utils/logger');

/**
 * Trata os cliques nos botões do painel de música (customId "music:<ação>").
 */
async function handleButton(interaction) {
  const action = interaction.customId.split(':')[1];
  const player = music.getPlayer(interaction.guild);

  // Nada tocando
  if (!player || !player.current) {
    return interaction.reply({
      embeds: [embeds.warn('Nada tocando', 'Não há música tocando no momento.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  // Só quem está na mesma call do bot pode controlar
  const userVoice = interaction.member?.voice?.channelId;
  if (userVoice !== player.voiceChannelId) {
    return interaction.reply({
      embeds: [embeds.warn('Entre na call', 'Você precisa estar na mesma call do bot para controlar a música.')],
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    switch (action) {
      case 'pause':
        player.togglePause();
        return interaction.update(player.renderPanel());

      case 'up':
        player.volumeUp();
        return interaction.update(player.renderPanel());

      case 'down':
        player.volumeDown();
        return interaction.update(player.renderPanel());

      case 'loop':
        player.toggleLoop();
        return interaction.update(player.renderPanel());

      case 'autoplay':
        player.toggleAutoplay();
        return interaction.update(player.renderPanel());

      case 'shuffle':
        player.shuffle();
        return interaction.update(player.renderPanel());

      case 'skip':
        // A troca de faixa posta um painel novo; só confirmamos o clique
        await interaction.deferUpdate();
        player.skip();
        return;

      case 'back': {
        await interaction.deferUpdate();
        const ok = player.back();
        if (!ok) {
          await interaction.followUp({
            embeds: [embeds.warn('Sem histórico', 'Não há música anterior para voltar.')],
            flags: MessageFlags.Ephemeral,
          }).catch(() => null);
        }
        return;
      }

      case 'stop':
        await interaction.reply({
          embeds: [embeds.success('Parado', '⏹️ Música parada e fila limpa. Saindo da call.')],
          flags: MessageFlags.Ephemeral,
        });
        player.stop();
        return;

      case 'playlist': {
        const linhas = [`▶️ **Tocando:** ${player.current.title}`];
        if (player.queue.length) {
          linhas.push('', '**Próximas:**',
            player.queue.slice(0, 10).map((t, i) => `\`${i + 1}.\` ${t.title}`).join('\n'));
          if (player.queue.length > 10) linhas.push(`… e mais ${player.queue.length - 10}.`);
        } else {
          linhas.push('', '_Fila vazia._');
        }
        return interaction.reply({
          embeds: [embeds.info('🎶 Playlist', linhas.join('\n'))],
          flags: MessageFlags.Ephemeral,
        });
      }

      default:
        return interaction.deferUpdate().catch(() => null);
    }
  } catch (err) {
    logger.error('Erro no botão de música:', err.message);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.deferUpdate().catch(() => null);
    }
  }
}

module.exports = { handleButton };
