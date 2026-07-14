'use strict';

const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

const { brand } = config;

/** Embed base já com a identidade do GGX. */
function base(color = brand.color) {
  return new EmbedBuilder()
    .setColor(color)
    .setFooter({ text: brand.footer })
    .setTimestamp();
}

module.exports = {
  base,
  info: (title, desc) => base(brand.color).setTitle(title).setDescription(desc || null),
  success: (title, desc) => base(brand.successColor).setTitle(`✅ ${title}`).setDescription(desc || null),
  warn: (title, desc) => base(brand.warnColor).setTitle(`⚠️ ${title}`).setDescription(desc || null),
  danger: (title, desc) => base(brand.dangerColor).setTitle(`⛔ ${title}`).setDescription(desc || null),
};
