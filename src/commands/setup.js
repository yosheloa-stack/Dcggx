'use strict';

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require('discord.js');
const store = require('../utils/store');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');

/**
 * /setup — Configuração automática e profissional do servidor.
 *
 * É IDEMPOTENTE e INTELIGENTE:
 *  - Reconhece canais/categorias que já existem (ignorando emojis e símbolos
 *    no nome, então "🔒 • verify" casa com "verify").
 *  - Aplica as permissões corretas tanto nos canais novos quanto nos que já
 *    existem — dá pra rodar quantas vezes quiser para "consertar" o servidor.
 *
 * Regras aplicadas por canal:
 *  - readonly : só a staff (GGX Admin/Moderador) manda mensagem; o resto lê.
 *  - open     : todo mundo conversa normalmente.
 *  - likes    : só o comando /like; ninguém digita nem vê o histórico.
 *  - staff    : só a staff vê o canal.
 *
 * Restrito ao DONO do servidor (ou administrador).
 */

const ROLES = [
  { name: 'GGX Admin', color: 0xed4245, permissions: [PermissionFlagsBits.Administrator] },
  { name: 'Moderador', color: 0x5865f2, permissions: [
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.ManageMessages,
  ] },
  { name: 'Membro', color: 0x57f287, permissions: [] },
  { name: 'Silenciado', color: 0x4f545c, permissions: [] },
];

const T = ChannelType.GuildText;
const V = ChannelType.GuildVoice;

const STRUCTURE = [
  {
    category: '📋・INFORMAÇÕES',
    catMatch: ['informacoes', 'servidor', 'info', 'inicio'],
    channels: [
      { name: '✅・verificação', match: ['verificacao', 'verify', 'verificar'], type: T, mode: 'readonly' },
      { name: '📜・regras', match: ['regras', 'rules', 'regra'], type: T, mode: 'readonly' },
      { name: '📢・avisos', match: ['avisos', 'aviso', 'anuncios', 'anuncio', 'announcements'], type: T, mode: 'readonly' },
      { name: '👋・bem-vindo', match: ['bemvindo', 'welcome', 'boasvindas'], type: T, mode: 'readonly' },
    ],
  },
  {
    category: '💬・COMUNIDADE',
    catMatch: ['comunidade', 'community'],
    channels: [
      { name: '💬・chat-geral', match: ['chatgeral', 'geral', 'general', 'chat', 'batepapo'], type: T, mode: 'open' },
      { name: '🖼️・mídia', match: ['midia', 'media', 'fotos'], type: T, mode: 'open' },
    ],
  },
  {
    category: '🤖・BOT',
    catMatch: ['bot', 'botajuda', 'bots'],
    channels: [
      { name: '👍・enviar-like', match: ['enviarlike', 'enviarlikes', 'like', 'likes', 'ggxlike', 'sendlike'], type: T, mode: 'likes' },
    ],
  },
  {
    category: '🔞・NSFW',
    catMatch: ['nsfw', 'adulto'],
    channels: [
      { name: '🔞・conteúdo-adulto', match: ['conteudoadulto', 'nsfw', 'adulto'], type: T, nsfw: true, mode: 'open' },
    ],
  },
  {
    category: '🔊・VOZ',
    catMatch: ['voz', 'voice', 'salasaberta', 'salas', 'call'],
    channels: [
      { name: '🔊 Geral', match: ['geralvoz', 'lobby', 'lobby1'], type: V, mode: 'voice' },
      { name: '🎵 Música', match: ['musica', 'music', 'music1'], type: V, mode: 'voice' },
    ],
  },
  {
    category: '🛡️・STAFF',
    catMatch: ['staff', 'equipe', 'moderacao'],
    staffOnly: true,
    channels: [
      { name: '📋・logs-ggx', match: ['logsggx', 'logs', 'log', 'registro'], type: T, isLog: true, mode: 'staff' },
      { name: '💬・sala-staff', match: ['salastaff', 'staffchat', 'chatstaff'], type: T, mode: 'staff' },
    ],
  },
];

/** Normaliza um nome: minúsculo e só letras/números (tira emojis, espaços, •, |, -). */
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configura automaticamente cargos, canais e permissões do servidor (somente dono).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({
      embeds: [embeds.info('⚙️ Configurando o servidor...', 'Ajustando cargos, canais e permissões. Isso pode levar alguns segundos.')],
      flags: MessageFlags.Ephemeral,
    });

    const guild = interaction.guild;
    const everyone = guild.roles.everyone;

    // Garante o cache completo antes de procurar/configurar
    await guild.channels.fetch().catch(() => null);
    await guild.roles.fetch().catch(() => null);

    const created = { roles: [], categories: [], channels: [] };
    const configured = [];

    // 1) Cargos ------------------------------------------------------------
    const roleMap = {};
    for (const def of ROLES) {
      let role = guild.roles.cache.find((r) => r.name === def.name);
      if (!role) {
        role = await guild.roles.create({
          name: def.name, color: def.color, permissions: def.permissions, reason: 'Setup do GGX',
        });
        created.roles.push(role.name);
      }
      roleMap[def.name] = role;
    }

    const staffIds = [roleMap['GGX Admin'].id, roleMap['Moderador'].id];
    let logChannelId = null;
    let likesChannelId = null;

    // Monta as permissões (overwrites) de cada canal conforme o modo
    const targetsFor = (mode) => {
      switch (mode) {
        case 'readonly':
          return [
            { id: everyone.id, options: { SendMessages: false, AddReactions: false, CreatePublicThreads: false, CreatePrivateThreads: false, SendMessagesInThreads: false } },
            ...staffIds.map((id) => ({ id, options: { ViewChannel: true, SendMessages: true, AddReactions: true } })),
          ];
        case 'open':
          return [
            { id: everyone.id, options: { ViewChannel: true, SendMessages: true, AddReactions: true } },
          ];
        case 'likes':
          return [
            { id: everyone.id, options: {
              ViewChannel: true, UseApplicationCommands: true,
              SendMessages: false, AddReactions: false, ReadMessageHistory: false,
              CreatePublicThreads: false, CreatePrivateThreads: false,
            } },
          ];
        case 'staff':
          return [
            { id: everyone.id, options: { ViewChannel: false } },
            ...staffIds.map((id) => ({ id, options: { ViewChannel: true, SendMessages: true } })),
          ];
        default:
          return []; // 'voice' e afins: sem overwrites especiais
      }
    };

    const applyPerms = async (channel, targets) => {
      for (const t of targets) {
        await channel.permissionOverwrites.edit(t.id, t.options, { reason: 'Setup do GGX' }).catch(() => null);
      }
    };

    // 2) Categorias e canais ----------------------------------------------
    for (const block of STRUCTURE) {
      const catSet = new Set([norm(block.category), ...(block.catMatch || [])]);
      let category = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && catSet.has(norm(c.name)),
      );

      if (!category) {
        category = await guild.channels.create({
          name: block.category, type: ChannelType.GuildCategory, reason: 'Setup do GGX',
        });
        created.categories.push(block.category);
      }

      if (block.staffOnly) {
        await applyPerms(category, [
          { id: everyone.id, options: { ViewChannel: false } },
          ...staffIds.map((id) => ({ id, options: { ViewChannel: true } })),
        ]);
      }

      for (const ch of block.channels) {
        const chSet = new Set([norm(ch.name), ...(ch.match || [])]);
        let channel = guild.channels.cache.find(
          (c) => c.type === ch.type && chSet.has(norm(c.name)),
        );

        if (!channel) {
          channel = await guild.channels.create({
            name: ch.name, type: ch.type, parent: category.id,
            nsfw: Boolean(ch.nsfw), reason: 'Setup do GGX',
          });
          created.channels.push(ch.name);
        } else {
          configured.push(channel.name);
        }

        await applyPerms(channel, targetsFor(ch.mode));
        if (ch.type === T && ch.nsfw && 'setNSFW' in channel) {
          await channel.setNSFW(true).catch(() => null);
        }

        if (ch.isLog) logChannelId = channel.id;
        if (ch.mode === 'likes') likesChannelId = channel.id;
      }
    }

    // 3) Salva referências nas configurações -------------------------------
    store.updateSettings(guild.id, {
      logChannelId,
      likesChannelId,
      mutedRoleId: roleMap['Silenciado'].id,
    });

    // 4) Cargo Silenciado: nega falar/reagir em todos os canais ------------
    const mutedRole = roleMap['Silenciado'];
    for (const channel of guild.channels.cache.values()) {
      if (channel.type === T || channel.type === V) {
        await channel.permissionOverwrites
          .edit(mutedRole, { SendMessages: false, AddReactions: false, Speak: false })
          .catch(() => null);
      }
    }

    logger.ok(`Setup concluído em ${guild.name}: ${created.channels.length} criados, ${configured.length} reconfigurados.`);

    const summary = embeds.success(
      'Servidor configurado!',
      [
        `**Cargos criados:** ${created.roles.length ? created.roles.join(', ') : 'nenhum (já existiam)'}`,
        `**Canais criados:** ${created.channels.length}`,
        `**Canais já existentes reconfigurados:** ${configured.length}`,
        logChannelId ? `**Canal de logs:** <#${logChannelId}>` : '',
        likesChannelId ? `**Canal de likes:** <#${likesChannelId}> (só o comando /like)` : '',
        '',
        'Pode rodar `/setup` de novo a qualquer momento para reaplicar as permissões.',
        'Use `/config` para ajustar anti-link, anti-spam, anti-NSFW e avisos.',
      ].filter(Boolean).join('\n'),
    );

    await interaction.followUp({ embeds: [summary], flags: MessageFlags.Ephemeral });
  },
};
