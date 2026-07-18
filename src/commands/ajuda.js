'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const embeds = require('../utils/embeds');

/** /ajuda — Lista os comandos e recursos do GGX. */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ajuda')
    .setDescription('Lista todos os comandos e recursos do GGX.'),

  async execute(interaction) {
    const embed = embeds.info('🤖 Central de Ajuda — GGX')
      .setDescription('Bot profissional de moderação e administração.\n\n💡 Prefere clicar em vez de digitar? Use `/painel` para abrir os comandos por **botão e formulário**.')
      .addFields(
        {
          name: '⚙️ Administração',
          value: [
            '`/setup` — cria cargos, categorias e canais automaticamente (dono)',
            '`/config ver` — mostra a configuração atual',
            '`/config sistema` — liga/desliga um sistema',
            '`/config acao` — define a punição de um sistema',
          ].join('\n'),
        },
        {
          name: '🛡️ Moderação',
          value: [
            '`/avisos add` — adiciona um aviso',
            '`/avisos ver` — vê os avisos de alguém',
            '`/avisos limpar` — limpa os avisos',
          ].join('\n'),
        },
        {
          name: '📢 Utilidades',
          value: [
            '`/marcar` — marca todo mundo (@everyone)',
            '`/like` — envia likes para um jogador do Free Fire',
            '`/ping` — latência do bot',
          ].join('\n'),
        },
        {
          name: '🎵 Música',
          value: [
            '`/tocar` — toca uma música na call (nome ou link do YouTube)',
            'Um **painel com botões** aparece: Pause, Skip, Back, Volume,',
            'Loop, Shuffle, AutoPlay, Stop e Playlist — tudo no clique!',
            '`/pular` `/pausar` `/retomar` `/fila` `/parar` também funcionam',
          ].join('\n'),
        },
        {
          name: '🔒 Proteções automáticas',
          value: [
            '**Anti-Link** — remove links não permitidos',
            '**Anti-Spam** — bloqueia flood e repetição',
            '**Anti-NSFW** — bloqueia pornografia (texto, links, figurinhas, imagens e vídeos)',
          ].join('\n'),
        },
      );
    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
