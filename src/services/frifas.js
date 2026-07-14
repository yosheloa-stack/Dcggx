'use strict';

const logger = require('../utils/logger');

/**
 * Cliente da Frifas Likes API — envio de likes diários no Free Fire.
 * Referência: https://github.com/HubsGGx/Daily-Likes-FreeFire
 *
 * A chave (key) é secreta e deve ficar no .env como FRIFAS_API_KEY.
 * A URL base pode ser trocada via FRIFAS_BASE_URL, se necessário.
 */

const BASE_URL = () => process.env.FRIFAS_BASE_URL || 'https://fluxdevservice.com/api/frifas';
const KEY = () => process.env.FRIFAS_API_KEY;

function isConfigured() {
  return Boolean(KEY());
}

/** Mensagens amigáveis para os erros de autenticação documentados. */
const AUTH_ERRORS = {
  INVALID_KEY: 'Chave de API não fornecida ou inválida.',
  KEY_BANNED: 'Chave banida por violar os termos de uso.',
  EXPIRED_KEY: 'Chave expirada.',
};

/**
 * Envia likes para um jogador do Free Fire.
 * @param {string} uid UID do jogador
 * @returns {Promise<{ok:true, data:object} | {ok:false, error:string}>}
 */
async function sendLikes(uid) {
  if (!isConfigured()) {
    return { ok: false, error: 'A chave da API (FRIFAS_API_KEY) não está configurada no bot.' };
  }

  const url = `${BASE_URL()}/sendlikes?key=${encodeURIComponent(KEY())}&id=${encodeURIComponent(uid)}`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const body = await res.json().catch(() => null);

    if (!res.ok || !body || body.sucesso !== true) {
      const status = body?.status;
      const msg =
        AUTH_ERRORS[status] ||
        body?.mensagem ||
        `A API respondeu com erro (HTTP ${res.status}).`;
      return { ok: false, error: msg };
    }

    const entry = Array.isArray(body.data) ? body.data[0] : null;
    if (!entry) {
      return { ok: false, error: 'A API não retornou dados da conta.' };
    }

    return {
      ok: true,
      data: {
        nome: entry.conta?.nome_conta ?? '—',
        id: entry.conta?.id_conta ?? uid,
        region: entry.conta?.region ?? '—',
        antes: entry.likes?.antes ?? 0,
        enviadas: entry.likes?.enviadas ?? 0,
        depois: entry.likes?.depois ?? 0,
      },
    };
  } catch (err) {
    logger.error('Erro ao chamar a Frifas API:', err.message);
    return { ok: false, error: 'Não consegui falar com o servidor de likes. Tente novamente mais tarde.' };
  }
}

module.exports = { sendLikes, isConfigured };
