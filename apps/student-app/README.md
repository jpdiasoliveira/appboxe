# RingPro — App aluno (Capacitor)

Shell nativo iOS/Android para o portal do aluno. Empacota o build Vite de [`frontend/`](../../frontend/) e trata deep link **`/convite/:token`**.

**Ticket:** UP-504

---

## Pré-requisitos

- Node.js 20+
- Build web: `frontend/.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (mesmo `.env` da raiz)
- **Android:** Android Studio + SDK
- **iOS:** Xcode (macOS)

---

## Setup (uma vez)

```bash
# 1. Dependências do app nativo
cd apps/student-app
npm install

# 2. Dependências do frontend (inclui @capacitor/app para deep links)
cd ../../frontend
npm install

# 3. Plataformas nativas (gera android/ e ios/ nesta pasta)
cd ../apps/student-app
npm run add:android   # e/ou
npm run add:ios
```

---

## Build e sync

```bash
cd apps/student-app
npm run sync
```

Isso executa `frontend` → `npm run build:capacitor` (`base ./`) e copia `frontend/dist` para os projetos nativos.

Abrir IDE:

```bash
npm run open:android
npm run open:ios
```

---

## Deep link — convite de matrícula

| Formato | Exemplo |
|---------|---------|
| Custom scheme | `ringpro://convite/TOKEN` |
| HTTPS (App Links / Universal Links) | `https://SEU_DOMINIO/convite/TOKEN` |

O handler está em `frontend/src/lib/deep-link.ts` + `CapacitorDeepLinkHandler` no `App.tsx`.

### Android — custom scheme

Após `npm run add:android`, confira em `android/app/src/main/AndroidManifest.xml` dentro de `<activity>`:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="ringpro" android:host="convite" />
</intent-filter>
```

Template versionado: [`android-deeplink/AndroidManifest.snippet.xml`](./android-deeplink/AndroidManifest.snippet.xml).

### iOS — custom scheme

Em `ios/App/App/Info.plist`, adicione (ou use o snippet em [`ios-deeplink/Info.plist.snippet.xml`](./ios-deeplink/Info.plist.snippet.xml)):

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>ringpro</string>
    </array>
  </dict>
</array>
```

### Teste rápido (Android emulator)

```bash
adb shell am start -a android.intent.action.VIEW -d "ringpro://convite/SEU_TOKEN" com.ringpro.student
```

---

## App Links / Universal Links (produção)

Para abrir `https://app.seudominio.com/convite/...` direto no app:

1. Hospedar `/.well-known/assetlinks.json` (Android) e `apple-app-site-association` (iOS).
2. Configurar intent-filter / Associated Domains no projeto nativo.
3. Ver [ADR-002 — landing subdomain](../../docs/decisoes/002-landing-subdomain.md) para domínio público.

---

## Escopo do MVP

- Empacota **todo** o frontend (não só rotas `/student/*`) — mesmo bundle que a web.
- Foco do ticket: shell + deep link convite; push FCM = UP-505 (ver abaixo).
- `simulate-payment` e dev shortcuts funcionam se o build apontar para Supabase dev.

---

## Push notifications (UP-505)

1. Criar projeto Firebase e adicionar apps Android/iOS com o mesmo `applicationId` / bundle.
2. Configurar `google-services.json` (Android) e APNs (iOS) nos projetos nativos.
3. Definir secret `FCM_SERVER_KEY` no Supabase (legacy server key).
4. Ativar flag **`module_notifications_push`** na academia (Plataforma → Feature flags).
5. O aluno abre o app nativo logado — `StudentPushHandler` registra o token via Edge `register-push-token`.

Eventos com push: lembretes de vencimento (`notify-upcoming-invoices`) e convite (`create-student-invite` / `resend-student-invite` para e-mail já cadastrado).

---

## Comandos úteis

| Comando | Onde |
|---------|------|
| `npm run build:capacitor` | `frontend/` — build com `base ./` |
| `npm run sync` | `apps/student-app/` |
| `npm run test` | `frontend/` — inclui `deep-link.test.ts` |
