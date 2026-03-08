# Deep Link Configuration — SMASHD

These files enable **universal links** (iOS) and **app links** (Android) so that
`playsmashd.com/player/[id]` and `playsmashd.com/join/[id]` open in the native
app when installed.

## Files

| File | Purpose | Hosted At |
|------|---------|-----------|
| `apple-app-site-association` | iOS universal links | `playsmashd.com/.well-known/apple-app-site-association` |
| `assetlinks.json` | Android app links | `playsmashd.com/.well-known/assetlinks.json` |

## Deployment (Vercel / Web App)

### Option A: Vercel `public/` directory

Copy the files into the web app:

```bash
mkdir -p deuce-switch-web/public/.well-known
cp apple-app-site-association deuce-switch-web/public/.well-known/
cp assetlinks.json deuce-switch-web/public/.well-known/
```

Then add headers in `vercel.json` so they're served with the correct content type:

```json
{
  "headers": [
    {
      "source": "/.well-known/apple-app-site-association",
      "headers": [
        { "key": "Content-Type", "value": "application/json" }
      ]
    },
    {
      "source": "/.well-known/assetlinks.json",
      "headers": [
        { "key": "Content-Type", "value": "application/json" }
      ]
    }
  ]
}
```

### Option B: Vercel rewrites (if `public/` doesn't work)

Add to `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/.well-known/apple-app-site-association",
      "destination": "/api/apple-app-site-association"
    }
  ]
}
```

And create a Vercel API route that returns the JSON.

## Android: SHA-256 Fingerprint

The `assetlinks.json` file needs your app's SHA-256 signing certificate fingerprint.

**For development builds (EAS):**

```bash
# After creating a production build with EAS:
eas credentials -p android
# Look for the SHA-256 certificate fingerprint
```

**For Google Play (upload key):**

Find it in Google Play Console → Setup → App signing → SHA-256 certificate fingerprint.

Replace `REPLACE_WITH_YOUR_SHA256_FINGERPRINT` in `assetlinks.json`.

## Supported Paths

| Path Pattern | Native Route | Description |
|-------------|-------------|-------------|
| `/player/:id` | `app/player/[id].tsx` | Public player profile |
| `/join/:id` | `app/join/[id].tsx` | Tournament join link |

## Verification

After deploying the web files and building the app:

1. **iOS**: Open Safari → paste `https://playsmashd.com/player/some-uuid` → should offer to open in Smashd
2. **Android**: Use `adb shell am start -a android.intent.action.VIEW -d "https://playsmashd.com/player/some-uuid"`
3. **Apple CDN cache**: Apple caches AASA files. Updates can take ~24 hours. Test with: `https://app-site-association.cdn-apple.com/a/v1/playsmashd.com`

## Native App Config

Already configured in `app.json`:

- **iOS**: `associatedDomains: ["applinks:playsmashd.com", "applinks:www.playsmashd.com"]`
- **Android**: `intentFilters` for `playsmashd.com/player/*` and `playsmashd.com/join/*`

These require a **new native build** (not OTA update) to take effect.
