'use strict';

const logger = require('../utils/logger');

/**
 * Cliente da API de likes do Free Fire (Auto Like System).
 * Documentação: https://autolikesystem.com.br/docs
 *
 * Cada chamada envia SEMPRE 220 likes (amount fixo).
 * A chave (key) é secreta e deve ficar no .env como FRIFAS_API_KEY.
 * A URL base pode ser trocada via FRIFAS_BASE_URL, se necessário.
 */

const BASE_URL = () => process.env.FRIFAS_BASE_URL || 'https://fluxggx.squareweb.app/yoshsystem/send';
const KEY = () => process.env.FRIFAS_API_KEY;

/** Quantidade fixa de likes enviada em cada chamada. */
const AMOUNT = 220;

function isConfigured() {
  return Boolean(KEY());
}

/** Mensagens amigáveis para os códigos de erro documentados. */
const API_ERRORS = {
  UNAUTHORIZED: 'Chave de API inválida ou expirada.',
  SEM_LIKES: 'A chave está sem saldo de likes.',
  LIKES_INSUFICIENTES: 'Saldo de likes insuficiente para enviar 220 likes.',
  INVALID_ID: 'UID do jogador inválido.',
  INVALID_AMOUNT: 'Quantidade de likes inválida.',
};

/**
 * Envia 220 likes para um jogador do Free Fire.
 * @param {string} uid UID do jogador
 * @returns {Promise<{ok:true, data:object} | {ok:false, error:string}>}
 */
async function sendLikes(uid) {
  if (!isConfigured()) {
    return { ok: false, error: 'A chave da API (FRIFAS_API_KEY) não está configurada no bot.' };
  }

  const url = `${BASE_URL()}?key=${encodeURIComponent(KEY())}&id=${encodeURIComponent(uid)}&amount=${AMOUNT}`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const body = await res.json().catch(() => null);

    if (!res.ok || !body || body.sucesso !== true) {
      // O código de erro pode vir em diferentes campos conforme o status HTTP.
      const code = [body?.status, body?.erro, body?.error, body?.codigo]
        .find((v) => typeof v === 'string');
      const msg =
        API_ERRORS[code] ||
        body?.mensagem ||
        `A API respondeu com erro (HTTP ${res.status}).`;
      return { ok: false, error: msg };
    }

    return {
      ok: true,
      data: {
        nome: body.nick ?? '—',
        id: body.id ?? uid,
        enviadas: Number(body.likes_enviados ?? 0),
        restantes: body.likes_restantes ?? null,
        dias: body.dias_restantes ?? null,
        mensagem: body.mensagem ?? null,
      },
    };
  } catch (err) {
    logger.error('Erro ao chamar a API de likes:', err.message);
    return { ok: false, error: 'Não consegui falar com o servidor de likes. Tente novamente mais tarde.' };
  }
}

module.exports = { sendLikes, isConfigured, AMOUNT };
