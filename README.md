# Vice City

Jogo de construção de cidades em voxel, sem grade, que roda no navegador e pode ser instalado como app (PWA).
Nome provisório.

## Como funciona

- **Front-end estático**: `index.html`, `css/app.css`, `js/game.js` (three.js r128 em `vendor/`). Não tem etapa de build.
- **PWA**: `manifest.webmanifest` + `sw.js` (funciona offline depois da primeira visita; o save local continua funcionando sem internet).
- **Supabase** (`config.js`): conta por e-mail e senha, save na nuvem (`saves`) e ranking público (`ranking`), protegidos por RLS.
  O esquema está em `supabase/migrations/`.
- **Vercel**: hospeda o site; cada `git push` na branch `main` publica sozinho.

## Rodar no computador

```bash
python3 -m http.server 8080   # depois abra http://localhost:8080
```

## Atualizar o app instalado

Ao mudar arquivos, troque `VERSION` em `sw.js` (ex.: `ps-v2`) para os aparelhos baixarem a versão nova.

## Configuração do Supabase (uma vez, no painel)

Authentication → URL Configuration → **Site URL** = o endereço da Vercel, e adicione o mesmo endereço em **Redirect URLs**.
Assim o link de confirmação de e-mail volta para o jogo.
