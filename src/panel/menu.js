'use strict';

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');

/**
 * Painel de comandos por BOTÃO e MODAL.
 *
 * Em vez de digitar cada slash command, o servidor posta um único painel
 * (comando /painel). Cada botão executa o comando correspondente:
 *   - comandos sem argumentos rodam na hora;
 *   - comandos que precisam de dados (tocar, like, marcar, avisos) abrem um
 *     MODAL para o usuário preencher, e então reaproveitam a mesma lógica dos
 *     slash commands já existentes.
 *
 * Todos os customId começam com "menu:".
 *   Botão:  menu:<acao>
 *   Modal:  menu:modal:<acao>
 */

const PREFIX = 'menu:';

// ---------------------------------------------------------------------------
// Construção do painel (embed + botões)
// ---------------------------------------------------------------------------

/** Monta a mensagem do painel (embed + linhas de botões). */
function buildPanelMessage() {
  const embed = embeds.info('🎛️ Painel de Comandos — GGX')
    .setDescription(
      'Controle o bot pelos **botões** abaixo. Os comandos que precisam de '
      + 'informações (música, like, marcação e avisos) abrem uma **janela** '
      + 'para você preencher.',
    )
    .addFields(
      { name: '🎵 Música', value: 'Tocar, Pular, Pausar, Retomar, Parar e Fila.', inline: false },
      { name: '📢 Utilidades', value: 'Like, Marcar todo mundo, Ping e Ajuda.', inline: false },
      { name: '🛡️ Moderação', value: 'Avisar, ver e limpar avisos (só staff).', inline: false },
      { name: '⚙️ Administração', value: 'Setup e configuração (só dono/admin).', inline: false },
    );

  const btn = (id, label, style, emoji) =>
    new ButtonBuilder().setCustomId(PREFIX + id).setLabel(label).setStyle(style).setEmoji(emoji);

  const rowMusica = new ActionRowBuilder().addComponents(
    btn('tocar', 'Tocar', ButtonStyle.Primary, '🎵'),
    btn('pular', 'Pular', ButtonStyle.Secondary, '⏭️'),
    btn('pausar', 'Pausar', ButtonStyle.Secondary, '⏸️'),
    btn('retomar', 'Retomar', ButtonStyle.Secondary, '▶️'),
    btn('parar', 'Parar', ButtonStyle.Danger, '⏹️'),
  );

  const rowUtil = new ActionRowBuilder().addComponents(
    btn('fila', 'Fila', ButtonStyle.Secondary, '🎶'),
    btn('like', 'Like', ButtonStyle.Success, '👍'),
    btn('marcar', 'Marcar', ButtonStyle.Primary, '📢'),
    btn('ping', 'Ping', ButtonStyle.Secondary, '🏓'),
    btn('ajuda', 'Ajuda', ButtonStyle.Secondary, '❓'),
  );

  const rowMod = new ActionRowBuilder().addComponents(
    btn('avisar', 'Avisar', ButtonStyle.Danger, '⚠️'),
    btn('veravisos', 'Ver avisos', ButtonStyle.Secondary, '📋'),
    btn('limparavisos', 'Limpar avisos', ButtonStyle.Secondary, '🧹'),
  );

  const rowAdmin = new ActionRowBuilder().addComponents(
    btn('setup', 'Setup', ButtonStyle.Secondary, '⚙️'),
    btn('configver', 'Config', ButtonStyle.Secondary, '🛠️'),
  );

  return { embeds: [embed], components: [rowMusica, rowUtil, rowMod, rowAdmin] };
}

// ---------------------------------------------------------------------------
// Permissões
// ---------------------------------------------------------------------------

function isBotOwner(interaction) {
  return interaction.user.id === process.env.OWNER_ID;
}
function isGuildOwner(interaction) {
  return Boolean(interaction.guild) && interaction.guild.ownerId === interaction.user.id;
}
function isAdmin(interaction) {
  return Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.Administrator));
}
/** Dono do bot, dono do servidor ou administrador. */
function isPrivileged(interaction) {
  return isBotOwner(interaction) || isGuildOwner(interaction) || isAdmin(interaction);
}
/** Tem uma permissão específica (ou é privilegiado). */
function hasPerm(interaction, flag) {
  return isPrivileged(interaction) || Boolean(interaction.memberPermissions?.has(flag));
}

function deny(interaction, msg = 'Você não tem permissão para usar isto.') {
  return interaction.reply({
    embeds: [embeds.danger('Sem permissão', msg)],
    flags: MessageFlags.Ephemeral,
  });
}

// ---------------------------------------------------------------------------
// Adaptador: roda um slash command já existente a partir de um modal/botão
// ---------------------------------------------------------------------------

/**
 * Cria um "interaction proxy" que expõe a API de options que os slash commands
 * esperam (getString/getUser/etc.), reaproveitando o próprio botão/modal para
 * reply/editReply/followUp. Assim não duplicamos a lógica dos comandos.
 */
function withOptions(interaction, { commandName, subcommand = null, strings = {}, booleans = {}, users = {}, channels = {} }) {
  const options = {
    getSubcommand: () => subcommand,
    getSubcommandGroup: () => null,
    getString: (name) => (name in strings ? strings[name] : null),
    getBoolean: (name) => (name in booleans ? booleans[name] : null),
    getUser: (name) => (name in users ? users[name] : null),
    getChannel: (name) => (name in channels ? channels[name] : null),
    getMember: () => null,
    getInteger: () => null,
    getNumber: () => null,
  };
  return new Proxy(interaction, {
    get(target, prop) {
      if (prop === 'options') return options;
      if (prop === 'commandName') return commandName;
      const value = target[prop];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

/** Executa um comando (por nome) usando o proxy de options. */
async function runCommand(interaction, client, commandName, opts = {}) {
  const command = client.commands.get(commandName);
  if (!command) {
    return interaction.reply({
      embeds: [embeds.danger('Indisponível', 'Esse comando não está carregado.')],
      flags: MessageFlags.Ephemeral,
    });
  }
  const proxy = withOptions(interaction, { commandName, ...opts });
  try {
    await command.execute(proxy);
  } catch (err) {
    logger.error(`Erro no painel (${commandName}):`, err.message);
    const payload = {
      embeds: [embeds.danger('Ops!', 'Ocorreu um erro ao executar essa ação.')],
      flags: MessageFlags.Ephemeral,
    };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => null);
    } else {
      await interaction.reply(payload).catch(() => null);
    }
  }
}

/** Resolve um usuário a partir de um texto (menção <@id> ou ID puro). */
async function resolveUser(interaction, raw) {
  const id = (raw || '').match(/\d{5,}/)?.[0];
  if (!id) return null;
  const member = await interaction.guild.members.fetch(id).catch(() => null);
  if (member) return member.user;
  return interaction.client.users.fetch(id).catch(() => null);
}

// ---------------------------------------------------------------------------
// Modais
// ---------------------------------------------------------------------------

function textRow(id, label, { style = TextInputStyle.Short, required = true, placeholder, maxLength } = {}) {
  const input = new TextInputBuilder()
    .setCustomId(id)
    .setLabel(label)
    .setStyle(style)
    .setRequired(required);
  if (placeholder) input.setPlaceholder(placeholder);
  if (maxLength) input.setMaxLength(maxLength);
  return new ActionRowBuilder().addComponents(input);
}

function buildModal(action) {
  switch (action) {
    case 'tocar':
      return new ModalBuilder().setCustomId(`${PREFIX}modal:tocar`).setTitle('🎵 Tocar música').addComponents(
        textRow('musica', 'Nome ou link do YouTube', { placeholder: 'Ex.: Imagine Dragons - Believer', maxLength: 300 }),
      );
    case 'like':
      return new ModalBuilder().setCustomId(`${PREFIX}modal:like`).setTitle('👍 Enviar likes (Free Fire)').addComponents(
        textRow('id', 'UID do jogador', { placeholder: 'Somente números', maxLength: 15 }),
      );
    case 'marcar':
      return new ModalBuilder().setCustomId(`${PREFIX}modal:marcar`).setTitle('📢 Marcar todo mundo').addComponents(
        textRow('mensagem', 'Mensagem (opcional)', { style: TextInputStyle.Paragraph, required: false, placeholder: 'Texto que acompanha a marcação', maxLength: 1000 }),
        textRow('aqui', 'Só quem está online?', { required: false, placeholder: 'Digite "sim" para @here (padrão: @everyone)', maxLength: 5 }),
      );
    case 'avisar':
      return new ModalBuilder().setCustomId(`${PREFIX}modal:avisar`).setTitle('⚠️ Adicionar aviso').addComponents(
        textRow('membro', 'Membro (ID ou @menção)', { placeholder: 'Ex.: 123456789012345678', maxLength: 40 }),
        textRow('motivo', 'Motivo do aviso', { placeholder: 'Ex.: flood no chat', maxLength: 300 }),
      );
    case 'veravisos':
      return new ModalBuilder().setCustomId(`${PREFIX}modal:veravisos`).setTitle('📋 Ver avisos').addComponents(
        textRow('membro', 'Membro (ID ou @menção)', { placeholder: 'Ex.: 123456789012345678', maxLength: 40 }),
      );
    case 'limparavisos':
      return new ModalBuilder().setCustomId(`${PREFIX}modal:limparavisos`).setTitle('🧹 Limpar avisos').addComponents(
        textRow('membro', 'Membro (ID ou @menção)', { placeholder: 'Ex.: 123456789012345678', maxLength: 40 }),
      );
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Roteamento dos botões
// ---------------------------------------------------------------------------

// Comandos sem argumentos: o botão roda o comando direto.
const DIRECT = new Set(['ping', 'ajuda', 'fila', 'pular', 'pausar', 'retomar', 'parar', 'setup']);
// Botões que abrem um modal.
const MODALS = new Set(['tocar', 'like', 'marcar', 'avisar', 'veravisos', 'limparavisos']);

async function handleButton(interaction, client) {
  const action = interaction.customId.slice(PREFIX.length);

  // Ações protegidas — checa permissão ANTES (modal não permite negar depois).
  if (action === 'setup' || action === 'configver') {
    if (!isPrivileged(interaction)) return deny(interaction, 'Apenas o dono ou administradores podem usar isto.');
  }
  if (action === 'marcar' && !hasPerm(interaction, PermissionFlagsBits.MentionEveryone)) {
    return deny(interaction, 'Você precisa da permissão de **Marcar @everyone**.');
  }
  if ((action === 'avisar' || action === 'veravisos' || action === 'limparavisos')
      && !hasPerm(interaction, PermissionFlagsBits.ModerateMembers)) {
    return deny(interaction, 'Apenas a staff (moderar membros) pode usar isto.');
  }

  if (action === 'configver') {
    return runCommand(interaction, client, 'config', { subcommand: 'ver' });
  }
  if (DIRECT.has(action)) {
    return runCommand(interaction, client, action);
  }
  if (MODALS.has(action)) {
    const modal = buildModal(action);
    if (modal) return interaction.showModal(modal);
  }

  return interaction.reply({
    embeds: [embeds.warn('Ação desconhecida', 'Esse botão não faz nada por aqui.')],
    flags: MessageFlags.Ephemeral,
  }).catch(() => null);
}

// ---------------------------------------------------------------------------
// Roteamento dos modais
// ---------------------------------------------------------------------------

async function handleModal(interaction, client) {
  const action = interaction.customId.slice(`${PREFIX}modal:`.length);
  const field = (id) => interaction.fields.getTextInputValue(id).trim();

  switch (action) {
    case 'tocar':
      return runCommand(interaction, client, 'tocar', { strings: { musica: field('musica') } });

    case 'like':
      return runCommand(interaction, client, 'like', { strings: { id: field('id') } });

    case 'marcar': {
      const aqui = /^(sim|s|here|aqui|yes|y|true)$/i.test(field('aqui'));
      return runCommand(interaction, client, 'marcar', {
        strings: { mensagem: field('mensagem') },
        booleans: { aqui },
      });
    }

    case 'avisar':
    case 'veravisos':
    case 'limparavisos': {
      const user = await resolveUser(interaction, field('membro'));
      if (!user) {
        return interaction.reply({
          embeds: [embeds.danger('Membro não encontrado', 'Confira o ID ou a menção e tente de novo.')],
          flags: MessageFlags.Ephemeral,
        });
      }
      const sub = action === 'avisar' ? 'add' : action === 'veravisos' ? 'ver' : 'limpar';
      const strings = action === 'avisar' ? { motivo: field('motivo') } : {};
      return runCommand(interaction, client, 'avisos', { subcommand: sub, users: { membro: user }, strings });
    }

    default:
      return interaction.reply({
        embeds: [embeds.warn('Ação desconhecida', 'Não sei o que fazer com esse formulário.')],
        flags: MessageFlags.Ephemeral,
      }).catch(() => null);
  }
}

module.exports = { PREFIX, buildPanelMessage, handleButton, handleModal };
