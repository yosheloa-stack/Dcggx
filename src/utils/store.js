'use strict';

const fs = require('fs');
const path = require('path');
const config = require('../../config');
const logger = require('./logger');

/**
 * Armazenamento simples baseado em arquivo JSON.
 * Guarda a configuração e os avisos de cada servidor sem precisar de banco.
 *
 * Estrutura:
 * {
 *   "<guildId>": {
 *     settings: { ...cópia de config.defaults... },
 *     warnings: { "<userId>": [ { reason, moderatorId, at } ] }
 *   }
 * }
 */
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const FILE = path.join(DATA_DIR, 'guilds.json');

let cache = {};

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '{}');
}

function load() {
  ensureFile();
  try {
    cache = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch (err) {
    logger.error('Falha ao ler data/guilds.json, começando vazio:', err.message);
    cache = {};
  }
}

function persist() {
  ensureFile();
  fs.writeFileSync(FILE, JSON.stringify(cache, null, 2));
}

/** Clona os defaults para um novo servidor. */
function freshGuild() {
  return {
    settings: JSON.parse(JSON.stringify(config.defaults)),
    warnings: {},
  };
}

/** Retorna (criando se preciso) o registro completo de um servidor. */
function getGuild(guildId) {
  if (!cache[guildId]) {
    cache[guildId] = freshGuild();
    persist();
  }
  return cache[guildId];
}

/** Atalho para as configurações de um servidor. */
function getSettings(guildId) {
  return getGuild(guildId).settings;
}

/** Aplica alterações parciais nas configurações e salva. */
function updateSettings(guildId, patch) {
  const guild = getGuild(guildId);
  guild.settings = deepMerge(guild.settings, patch);
  persist();
  return guild.settings;
}

/** Registra um aviso e devolve o total atual do usuário. */
function addWarning(guildId, userId, reason, moderatorId) {
  const guild = getGuild(guildId);
  if (!guild.warnings[userId]) guild.warnings[userId] = [];
  guild.warnings[userId].push({ reason, moderatorId, at: Date.now() });
  persist();
  return guild.warnings[userId].length;
}

function getWarnings(guildId, userId) {
  return getGuild(guildId).warnings[userId] || [];
}

function clearWarnings(guildId, userId) {
  const guild = getGuild(guildId);
  guild.warnings[userId] = [];
  persist();
}

/** Merge recursivo simples (objetos puros). Arrays são substituídos. */
function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    const val = source[key];
    if (val && typeof val === 'object' && !Array.isArray(val) && typeof out[key] === 'object') {
      out[key] = deepMerge(out[key], val);
    } else {
      out[key] = val;
    }
  }
  return out;
}

load();

module.exports = {
  getGuild,
  getSettings,
  updateSettings,
  addWarning,
  getWarnings,
  clearWarnings,
};
