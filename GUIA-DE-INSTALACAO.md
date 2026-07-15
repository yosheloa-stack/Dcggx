# 📘 Guia Completo de Instalação — Bot GGX

Passo a passo do zero até o bot online. É só seguir na ordem.

---

## ✅ Antes de começar
Você vai precisar de:
- **Node.js 18 ou superior** instalado ([baixar aqui](https://nodejs.org))
- Uma conta no **Discord**
- A chave da **API de likes** do Free Fire (`FRIFAS_API_KEY`)

No final, você terá preenchido 4 valores principais no arquivo `.env`:
`DISCORD_TOKEN`, `CLIENT_ID`, `OWNER_ID` e `FRIFAS_API_KEY`.

---

## 🔑 1. Pegar o TOKEN

1. Acesse https://discord.com/developers/applications e faça login.
2. Se ainda não criou o app: **New Application** → nome **GGX** → **Create**.
3. Menu da esquerda → **Bot**.
4. Clique em **Reset Token** → **Yes, do it!** (pode pedir senha/2FA).
5. Vai aparecer o token (uma linha grande). Clique em **Copy**.

> ⚠️ **O token é a senha do bot.** Nunca mande pra ninguém nem suba no GitHub.
> Se vazar, volte aqui e clique em **Reset Token** de novo.

No `.env`:
```
DISCORD_TOKEN=cola_o_token_aqui
```

---

## 🆔 2. Pegar o CLIENT_ID (Application ID)

1. Mesmo site, menu da esquerda → **General Information**.
2. Copie o **Application ID**.

No `.env`:
```
CLIENT_ID=cola_o_application_id_aqui
```

---

## 🔒 3. Ligar os Intents (MUITO IMPORTANTE)

Ainda na aba **Bot**, role até **Privileged Gateway Intents** e ligue:
- ✅ **SERVER MEMBERS INTENT**
- ✅ **MESSAGE CONTENT INTENT**
- ⬜ PRESENCE INTENT — pode deixar **desligado** (o bot não usa)

Clique em **Save Changes**.

> O intent de **voz (Voice States)**, usado pela música, **não tem chavinha aqui** —
> ele já está ativado direto no código. Você não precisa fazer nada pra isso.

Se ao ligar o bot aparecer o erro **"Used disallowed intents"**, é porque uma
dessas duas chavinhas não foi salva. Volte aqui e confira.

---

## 👤 4. Pegar o OWNER_ID (seu ID de usuário)

Esse é o **SEU** ID no Discord (não é o do bot). Serve pra você ser o dono e
poder usar `/setup` e `/config`.

1. Abra o **Discord**.
2. **Configurações de usuário** (engrenagem) → **Avançado** → ligue o **Modo Desenvolvedor**.
3. Feche as configurações, clique com o **botão direito no seu nome/foto** →
   **Copiar ID do usuário**.

No `.env`:
```
OWNER_ID=cola_o_seu_id_aqui
```

---

## 🤖 5. Convidar o bot pro servidor

1. No portal, menu da esquerda → **OAuth2** → **URL Generator**.
2. Em **SCOPES**, marque:
   - ✅ `bot`
   - ✅ `applications.commands`
3. Na caixa **BOT PERMISSIONS** que aparece embaixo, marque:
   - ✅ **Administrator** (mais fácil — cobre moderação, criar canais e música)
4. Copie a **URL gerada** lá embaixo, cole no navegador, escolha seu servidor e
   clique em **Autorizar**.

---

## ⚙️ 6. Configurar e ligar o bot

No terminal, dentro da pasta do projeto:

```bash
# 1. instalar as dependências (só na primeira vez)
npm install

# 2. criar o arquivo de configuração
cp .env.example .env

# 3. edite o .env e preencha os valores (veja o resumo abaixo)

# 4. registrar os comandos no Discord
npm run deploy

# 5. ligar o bot
npm start
```

Se deu certo, o terminal mostra:
```
OK    GGX online como GGX#1234
```

---

## 📄 Resumo do arquivo `.env`

```
DISCORD_TOKEN=...      # passo 1 (token do bot)
CLIENT_ID=...          # passo 2 (Application ID)
OWNER_ID=...           # passo 4 (seu ID de usuário)
GUILD_ID=              # opcional — ID do servidor p/ comandos aparecerem na hora
FRIFAS_API_KEY=...     # chave da API de likes do Free Fire

# (opcional) detecção real de imagem/vídeo NSFW:
SIGHTENGINE_API_USER=
SIGHTENGINE_API_SECRET=
```

> 💡 **Dica:** No começo, preencha o `GUILD_ID` (botão direito no nome do
> servidor → **Copiar ID do servidor**). Assim os comandos aparecem **na hora**.
> Sem ele, o registro é global e pode levar até 1 hora pra aparecer.

---

## 🎮 7. Usar no Discord

1. Digite **`/setup`** — o bot cria sozinho os cargos, categorias e canais
   (incluindo o canal exclusivo `👍-enviar-like`).
2. Teste os comandos:
   - `/like id:<UID>` — envia likes no Free Fire
   - `/tocar musica:<nome>` — toca música na call
   - `/ajuda` — lista tudo

---

## ❓ Problemas comuns

| Erro | Causa | Solução |
|---|---|---|
| `Used disallowed intents` | Intents não ativados | Passo 3 — ligue e **salve** as chavinhas |
| `DISCORD_TOKEN não definido` | `.env` sem token | Passo 1 — preencha o `.env` |
| Comandos não aparecem | Registro global demora | Use `GUILD_ID` e rode `npm run deploy` de novo |
| Bot não toca música | Sem permissão de voz | Dê **Conectar** e **Falar** ao bot no canal |
| `A chave da API não está configurada` | `FRIFAS_API_KEY` vazio | Preencha a chave no `.env` |

---

Feito com ❤️ para a comunidade **GGX**.
