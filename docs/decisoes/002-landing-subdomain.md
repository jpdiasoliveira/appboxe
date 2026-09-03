# ADR-002 — Subdomínio landing V2 (`{slug}.ringpro.app`)

**Status:** Aceito (preparação)  
**Relacionado:** UP-406, PRD §9.1

## Contexto

No MVP a landing pública usa path:

```text
https://ringpro.app/a/{slug}
```

Para V2 o produto prevê subdomínio por academia:

```text
https://{slug}.ringpro.app
```

## Decisão

1. **MVP permanece em `/a/{slug}`** — sem breaking change.
2. **Infra (fora do app):** wildcard DNS `*.ringpro.app` → mesmo host do frontend (Vite/CDN).
3. **App:** helper `resolveLandingPath(slug)` centraliza URLs geradas no editor e convites.
4. **Redirect:** quando subdomínio estiver ativo, `{slug}.ringpro.app` serve a mesma `PublicLandingPage` resolvendo `slug` do hostname.

## Implementação futura (checklist)

- [ ] DNS: registro `*` CNAME para deploy estático
- [ ] `frontend/src/lib/landing-url.ts`: `publicLandingUrl(slug, { subdomain?: boolean })`
- [ ] `PublicLandingPage`: rota opcional sem `/a/:slug` quando `window.location.hostname` ≠ apex
- [ ] Redirect 301 de `/a/{slug}` → `{slug}.ringpro.app` (config CDN/nginx)
- [ ] Cookies/auth: apex `ringpro.app` vs subdomínios — revisar `SameSite` se login cruzado

## Consequências

- Academias podem divulgar URL mais curta.
- SSL wildcard obrigatório em produção.
- Não altera tenant nem RLS — `slug` continua chave pública.
