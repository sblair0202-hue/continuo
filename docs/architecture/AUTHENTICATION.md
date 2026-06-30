# Continuo — Authentication

## Overview

Continuo uses three sign-in methods:
1. Email + password (primary)
2. Apple Sign-In (iOS only)
3. Google Sign-In (browser-based OAuth via Railway backend)

All methods issue a Continuo JWT stored in iOS Keychain via `expo-secure-store`.

---

## Email / Password

```
User enters email + password
        ↓
POST /auth/login
        ↓
bcrypt verify → issue JWT
        ↓
Stored in Keychain (TOKEN_KEY)
```

Rate limited: 10 attempts per IP per 5 minutes.

---

## Apple Sign-In

```
expo-apple-authentication.signInAsync()
        ↓
Apple identity token returned natively
        ↓
POST /auth/apple { identity_token, email, full_name }
        ↓
Backend verifies token with Apple → create/find user → issue JWT
```

---

## Google Sign-In

```
Linking.openURL(`${API_BASE_URL}/auth/google-connect`)
        ↓
GET /auth/google-connect
  → builds OAuth URL with GOOGLE_AUTH_REDIRECT_URI
  → redirects browser to Google
        ↓
Google authenticates user
        ↓
GET /auth/google-callback?code=...
  → exchanges code for access_token via /token endpoint
  → fetches userinfo from Google
  → create/find user in DB
  → issues Continuo JWT
  → redirects to continuo://auth/callback?token=...
        ↓
App deep link handler (auth/callback.tsx) receives token
  → calls loginWithToken()
  → stores in Keychain
```

### Required env vars
| Variable | Value (production) |
|----------|-------------------|
| `GOOGLE_CLIENT_ID` | `196906565572-lsb031738mq07qvjn8e09g2t3d0ef8fm.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | (set in Railway) |
| `GOOGLE_AUTH_REDIRECT_URI` | `https://continuo-production-2d36.up.railway.app/auth/google-callback` |

### Google Cloud Console
The following URI must be registered under the **Continuo Production** Web client:
```
https://continuo-production-2d36.up.railway.app/auth/google-callback
```

### Client IDs
| Client | ID | Used where |
|--------|-----|-----------|
| Web | `196906565572-lsb031738mq07qvjn8e09g2t3d0ef8fm` | Backend (all three flows) |
| iOS | `196906565572-u239l185vgso2hjlqc851pql4108h584` | `CFBundleURLSchemes` in app.json (for future native SDK use) |

The backend uses the **Web** client exclusively. The iOS client ID is registered in app.json as a URL scheme so Google can redirect back to the app — it is not used as an OAuth client ID.

---

## JWT Lifecycle

- Algorithm: HS256
- Expiry: 7 days
- Signing secret: `JWT_SECRET` env var
- Storage: iOS Keychain via `expo-secure-store` (key: `continuo_auth_v1`)
- On app launch: token loaded from Keychain; user context restored
- Biometric unlock: available if Face ID/Touch ID enrolled; gates app access without re-authentication

---

## Calendar / Gmail OAuth (Integration Auth — not sign-in)

These are separate from app authentication. They authorize Continuo's backend to access Google Calendar and Gmail on the user's behalf.

```
Calendar: browser → /calendar/connect → Google → /calendar/callback
Gmail:    browser → /email/connect    → Google → /email/callback
```

Tokens stored in `CalendarToken` / `EmailToken` tables (not Keychain).

See INTEGRATIONS.md for full details.

---

## App Deep Link Scheme

| Scheme | Usage |
|--------|-------|
| `continuo://auth/callback` | Google Sign-In return URL |

Registered in `app.json` under `scheme: "continuo"` and `CFBundleURLTypes`.

---

## Seeded Admin Account

On first startup, `seed_admin()` creates:
- Email: `sblair0202@gmail.com`
- Password: `ADMIN_PASSWORD` env var (default: `Continuo2024!`)
- Role: `admin`
