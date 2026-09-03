# Security — RingPro

- **Anon key** apenas no frontend (`VITE_*`)
- **Service role** só em scripts locais / Edge Functions — nunca no bundle
- RLS em todas as tabelas `public`
- ASSISTANT: deny financeiro no RLS (Wave 3+)
- PCI: cartão só portal aluno via Pagar.me token (Wave 4)
- Rotacionar keys se expostas em chat
