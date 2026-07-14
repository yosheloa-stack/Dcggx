'use strict';

/**
 * Logger simples com cores e horário. Nada de dependências externas.
 */
const colors = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function timestamp() {
  return new Date().toLocaleString('pt-BR', { hour12: false });
}

function base(tag, color, args) {
  console.log(`${colors.gray}[${timestamp()}]${colors.reset} ${color}${tag}${colors.reset}`, ...args);
}

module.exports = {
  info: (...a) => base('INFO ', colors.cyan, a),
  ok: (...a) => base('OK   ', colors.green, a),
  warn: (...a) => base('AVISO', colors.yellow, a),
  error: (...a) => base('ERRO ', colors.red, a),
  mod: (...a) => base('MOD  ', colors.blue, a),
};
