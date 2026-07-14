'use strict';

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} = require('discord.js');
const store = require('../utils/store');
const embeds = require('../utils/embeds');

/**
 * /setup — Configuração automática e profissional do servidor.
 * Cria cargos, categorias e canais organizados, e registra o canal de logs
 * e o cargo de silenciado nas configurações do GGX.
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

const STRUCTURE = [
  {
    category: '📋 INFORMAÇÕES',
    channels: [
      { name: 'bem-vindo', type: ChannelType.GuildText, readOnly: true },
      { name: 'regras', type: ChannelType.GuildText, readOnly: true },
      { name: 'anúncios', type: ChannelType.GuildText, readOnly: true },
    ],
  },
  {
    category: '💬 COMUNIDADE',
    channels: [
      { name: 'chat-geral', type: ChannelType.GuildText },
      { name: 'conversa', type: ChannelType.GuildText },
      { name: 'mídia', type: ChannelType.GuildText },
    ],
  },
  {
    category: '👍 LIKES',
    channels: [
      // Canal exclusivo do comando /like: ninguém digita, só usa o comando
      { name: '👍-enviar-like', type: ChannelType.GuildText, likesOnly: true },
    ],
  },
  {
    category: '🔞 NSFW',
    channels: [
      { name: 'conteudo-adulto', type: ChannelType.GuildText, nsfw: true },
    ],
  },
  {
    category: '🔊 VOZ',
    channels: [
      { name: 'Call Geral', type: ChannelType.GuildVoice },
      { name: 'Música 🎵', type: ChannelType.GuildVoice },
      { name: 'Jogos', type: ChannelType.GuildVoice },
    ],
  },
  {
    category: '🛡️ STAFF',
    staffOnly: true,
    channels: [
      { name: 'logs-ggx', type: ChannelType.GuildText, isLog: true },
      { name: 'sala-staff', type: ChannelType.GuildText },
      { name: 'Reunião Staff', type: ChannelType.GuildVoice },
    ],
  },
];

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configura automaticamente cargos, categorias e canais do servidor (somente dono).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.reply({
      embeds: [embeds.info('⚙️ Configurando o servidor...', 'Criando cargos, categorias e canais. Isso pode levar alguns segundos.')],
      flags: MessageFlags.Ephemeral,
    });

    const guild = interaction.guild;
    const everyone = guild.roles.everyone;
    const created = { roles: [], categories: [], channels: [] };

    // 1) Cargos ------------------------------------------------------------
    const roleMap = {};
    for (const def of ROLES) {
      let role = guild.roles.cache.find((r) => r.name === def.name);
      if (!role) {
        role = await guild.roles.create({
          name: def.name,
          color: def.color,
          permissions: def.permissions,
          reason: 'Setup do GGX',
        });
        created.roles.push(role.name);
      }
      roleMap[def.name] = role;
    }

    const staffRoles = [roleMap['GGX Admin'].id, roleMap['Moderador'].id];
    let logChannelId = null;
    let likesChannelId = null;

    // 2) Categorias e canais ----------------------------------------------
    for (const block of STRUCTURE) {
      let category = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === block.category,
      );

      const catOverwrites = block.staffOnly
        ? [
            { id: everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            ...staffRoles.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel] })),
          ]
        : [];

      if (!category) {
        category = await guild.channels.create({
          name: block.category,
          type: ChannelType.GuildCategory,
          permissionOverwrites: catOverwrites,
          reason: 'Setup do GGX',
        });
        created.categories.push(block.category);
      }

      for (const ch of block.channels) {
        const exists = guild.channels.cache.find(
          (c) => c.name === ch.name && c.parentId === category.id,
        );
        if (exists) {
          if (ch.isLog) logChannelId = exists.id;
          if (ch.likesOnly) likesChannelId = exists.id;
          continue;
        }

        const overwrites = [];
        if (ch.readOnly) {
          overwrites.push(
            { id: everyone.id, deny: [PermissionFlagsBits.SendMessages] },
            ...staffRoles.map((id) => ({ id, allow: [PermissionFlagsBits.SendMessages] })),
          );
        }
        if (ch.likesOnly) {
          // Ninguém digita/reage: só dá pra usar o comando /like
          overwrites.push({
            id: everyone.id,
            deny: [
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AddReactions,
              PermissionFlagsBits.CreatePublicThreads,
              PermissionFlagsBits.CreatePrivateThreads,
            ],
            allow: [PermissionFlagsBits.UseApplicationCommands, PermissionFlagsBits.ViewChannel],
          });
        }

        const channel = await guild.channels.create({
          name: ch.name,
          type: ch.type,
          parent: category.id,
          nsfw: Boolean(ch.nsfw),
          permissionOverwrites: overwrites.length ? overwrites : undefined,
          reason: 'Setup do GGX',
        });
        created.channels.push(ch.name);
        if (ch.isLog) logChannelId = channel.id;
        if (ch.likesOnly) likesChannelId = channel.id;
      }
    }

    // 3) Salva referências nas configurações -------------------------------
    store.updateSettings(guild.id, {
      logChannelId,
      likesChannelId,
      mutedRoleId: roleMap['Silenciado'].id,
    });

    // 4) Aplica o cargo Silenciado a todos os canais (negar fala) ----------
    const mutedRole = roleMap['Silenciado'];
    for (const channel of guild.channels.cache.values()) {
      if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildVoice) {
        await channel.permissionOverwrites
          .edit(mutedRole, {
            SendMessages: false,
            AddReactions: false,
            Speak: false,
          })
          .catch(() => null);
      }
    }

    const summary = embeds.success(
      'Servidor configurado!',
      [
        `**Cargos criados:** ${created.roles.length ? created.roles.join(', ') : 'nenhum (já existiam)'}`,
        `**Categorias criadas:** ${created.categories.length}`,
        `**Canais criados:** ${created.channels.length}`,
        logChannelId ? `**Canal de logs:** <#${logChannelId}>` : '',
        likesChannelId ? `**Canal de likes:** <#${likesChannelId}> (só o comando /like)` : '',
        '',
        'Use `/config` para ajustar anti-link, anti-spam, anti-NSFW e avisos.',
      ].filter(Boolean).join('\n'),
    );

    await interaction.followUp({ embeds: [summary], flags: MessageFlags.Ephemeral });
  },
};
