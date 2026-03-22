# ☁️ Cloud Sync Setup Guide

JPad supports syncing your notes across devices using **Supabase Storage** (recommended) or **WebDAV**.

Your notes are synced as **files to a storage bucket** — not as database rows — so they remain portable and human-readable.

---

## Option A: Supabase Cloud (Recommended)

Supabase offers a generous free tier (1 GB storage, unlimited API requests) and works on all platforms.

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free).
2. Click **New Project** and give it a name (e.g., `jpad-sync`).
3. Choose a region close to you and set a database password (you won't need this for storage sync, but it's required).
4. Wait for the project to finish setting up (~2 minutes).

### 2. Create a Storage Bucket

1. In your Supabase dashboard, click **Storage** in the left sidebar.
2. Click **New Bucket**.
3. Name it `notes` (or any name you prefer).
4. Toggle **Public bucket** to **ON** (this makes files accessible via your API key).
5. Click **Create bucket**.

### 3. Add a Storage Policy

Even with a public bucket, Supabase requires an explicit policy to allow uploads.

1. In the **Storage** section, click the **Policies** tab.
2. Under your bucket, click **New Policy** → **For full customization**.
3. Configure:
   - **Policy name**: `Allow all operations`
   - **Allowed operations**: Select ALL (SELECT, INSERT, UPDATE, DELETE)
   - **Target roles**: `anon`
   - **USING expression**: `bucket_id = 'notes'`
   - **WITH CHECK expression**: `bucket_id = 'notes'`
4. Click **Save**.

> **Alternative:** Run this in the **SQL Editor**:
> ```sql
> create policy "Allow all operations"
> on storage.objects for all
> using ( bucket_id = 'notes' )
> with check ( bucket_id = 'notes' );
> ```

### 4. Get Your API Credentials

1. Go to **Settings** → **API** in your Supabase dashboard.
2. Copy the **Project URL** (e.g., `https://abc123.supabase.co`).
3. Copy the **anon / public** key (starts with `eyJhbG...`).

### 5. Connect in JPad

1. Open JPad and go to **Settings** (gear icon).
2. Click the **Cloud Sync** tab.
3. Select **Supabase Cloud**.
4. Paste your **Project URL** and **Anon API Key**.
5. Set the **Bucket Name** to match what you created (e.g., `notes`).
6. Click **Test Connection** to verify everything works.
7. Click **Connect**.

Your notes will now auto-sync every 5 minutes. You can also click the cloud icon in the status bar to sync manually.

---

## Option B: WebDAV / NAS

If you have a Synology NAS, Nextcloud instance, or any WebDAV server, you can sync directly to it.

### 1. Enable WebDAV on Your Server

- **Synology**: Install the WebDAV Server package from Package Center.
- **Nextcloud**: WebDAV is built-in at `https://your-server/remote.php/dav/files/USERNAME/`.
- **Other**: Consult your server's documentation.

### 2. Connect in JPad

1. Open JPad and go to **Settings** → **Cloud Sync**.
2. Select **WebDAV / NAS**.
3. Enter your **Server URL**, **Username**, and **Password**.
4. Set the **Remote Path** (e.g., `/jpad-notes`). The folder will be created if it doesn't exist.
5. Click **Test Connection** to verify.
6. Click **Connect**.

---

## How Sync Works

- **Conflict resolution**: The newest version of a file always wins (based on modification time).
- **Auto-sync**: Runs every 5 minutes by default when connected.
- **Manual sync**: Click the cloud icon in the bottom status bar.
- **New files**: Files that only exist on one side are copied to the other.
- **Deletions**: Deleting a file locally does NOT delete it from the cloud (and vice versa). This is intentional to prevent accidental data loss.

## Sync Status Icons

| Icon | Meaning |
|------|---------|
| ☁️ **Cloud** (colored) | Connected, ready to sync |
| 🔄 **Spinning** | Sync in progress |
| ✅ **Cloud + Check** | Last sync completed successfully |
| ⚠️ **Cloud Alert** (red) | Sync error — click for details |
| ☁️ **Cloud Off** (dimmed) | Sync disabled |

## Security

- **Credentials are stored locally** on your device only (in the browser's localStorage). They are never committed to version control or sent anywhere except to your configured server.
- **Open-source friendly**: No secrets in the codebase. Each user configures their own credentials.
- **Supabase anon key**: This is a *public* client-side key. It only grants access as defined by your RLS policies. It's safe to use in a client app.
- **`.env` is gitignored**: Even if you configure credentials via environment variables, they won't be pushed to your repository.
