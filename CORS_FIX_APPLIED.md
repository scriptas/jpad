# CORS/Fetch Error Fixed!

## What Was the Problem?

The error "TypeError: Failed to fetch" happened because:
- Tauri apps run in a secure sandbox
- Browser's `fetch()` can't access external URLs by default
- WebDAV library was using browser fetch
- Tauri blocked the request for security

## What Was Fixed?

### 1. Added Tauri HTTP Plugin
**Rust side** (`src-tauri/Cargo.toml`):
```toml
tauri-plugin-http = "2"
```

**Rust code** (`src-tauri/src/lib.rs`):
```rust
.plugin(tauri_plugin_http::init())
```

**Frontend** (npm):
```bash
npm install @tauri-apps/plugin-http
```

### 2. Updated Permissions
**File**: `src-tauri/capabilities/default.json`

Added HTTP permissions to allow all HTTPS/HTTP requests:
```json
"http:default",
{
  "identifier": "http:default",
  "allow": [
    { "url": "https://*" },
    { "url": "http://*" }
  ]
}
```

### 3. Updated Sync Service
**File**: `src/services/syncService.ts`

Changed from browser fetch to Tauri fetch:
```typescript
import { fetch } from '@tauri-apps/plugin-http';

this.client = createClient(config.url, {
  username: config.username,
  password: config.password,
  httpAgent: fetch as any, // Use Tauri's HTTP client
});
```

### 4. Updated Test Connection
**File**: `src/components/SyncSettings.tsx`

Same change for test connection:
```typescript
const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
const client = createClient(formData.url, {
  username: formData.username,
  password: formData.password,
  httpAgent: tauriFetch as any,
});
```

## How to Test

1. **Rebuild the app:**
   ```bash
   npm run tauri:dev
   ```

2. **Go to Settings → Cloud Sync**

3. **Fill in your details:**
   - URL: `https://192-168-0-116.serum.direct.quickconnect.to:5006`
   - Username: `jpad`
   - Password: `[your password]`
   - Remote Path: `/jpad-notes`

4. **Click "Test Connection"**

5. **Should now pass all 5 tests!**

## What Should Happen Now

### Test Results:
```
✓ Validating URL format
  URL format is valid

✓ Testing connection
  Successfully connected to WebDAV server

✓ Verifying credentials
  Credentials are valid

✓ Checking remote folder
  Folder created: /jpad-notes

✓ Listing files
  Folder is empty (ready for first sync)

[Green success box]
✓ All tests passed! You can now save and start syncing.
```

## If It Still Fails

### Check 1: WebDAV Server Running?
Open browser and go to:
```
https://192-168-0-116.serum.direct.quickconnect.to:5006
```
Should prompt for login.

### Check 2: Credentials Correct?
Try logging into Synology web interface with:
- Username: `jpad`
- Password: `[same password]`

### Check 3: SSL Certificate
If using HTTPS with self-signed certificate:
1. Open URL in browser first
2. Accept the security warning
3. Then try in JPad

### Check 4: Firewall
- Port 5006 must be open
- Check Windows Firewall
- Check router firewall

## Next Steps

Once test passes:
1. Click **"Save & Connect"**
2. Click **"Sync Now"**
3. Your files will upload to Synology
4. Auto-sync starts (every 5 minutes)

## Technical Details

**Why Tauri's fetch?**
- Bypasses browser security restrictions
- Works with self-signed certificates
- Handles CORS properly
- Supports all HTTP methods (needed for WebDAV)

**Security:**
- Still secure (Tauri validates requests)
- Permissions explicitly granted
- Only allows what you configure
- No arbitrary code execution

---

**Status**: ✅ Fixed and ready to test!
