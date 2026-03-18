# Cloud Sync Setup Guide

JPad now supports cloud synchronization with your Synology NAS using WebDAV. This allows you to sync your notes across multiple devices while keeping your data on your own server.

## Prerequisites

- Synology NAS with DSM 6.0 or later
- Network access to your Synology (local network or via QuickConnect/DDNS)
- A user account on your Synology

## Setup Instructions

### 1. Enable WebDAV on Synology

1. Log into your Synology DSM
2. Go to **Control Panel** → **File Services**
3. Click on the **WebDAV** tab
4. Check **Enable WebDAV** and/or **Enable WebDAV HTTPS connection**
5. Note the port numbers:
   - HTTP: Usually port 5005
   - HTTPS: Usually port 5006 (recommended for security)
6. Click **Apply**

### 2. Create a Shared Folder (Optional but Recommended)

1. Go to **Control Panel** → **Shared Folder**
2. Click **Create** → **Create Shared Folder**
3. Name it `jpad-notes` (or any name you prefer)
4. Grant read/write permissions to your user account
5. Click **OK**

### 3. Configure JPad

1. Open JPad Settings (gear icon or Ctrl/Cmd+,)
2. Navigate to **Cloud Sync** section
3. Fill in the following:

   **WebDAV Server URL:**
   - Local network: `http://192.168.1.100:5005` or `https://192.168.1.100:5006`
   - External (DDNS): `https://yourname.synology.me:5006`
   - QuickConnect: `https://serum.quickconnect.to:5006`

   **Username:** Your Synology username

   **Password:** Your Synology password

   **Remote Path:** `/jpad-notes` (or the path to your shared folder)

4. Click **Test Connection** to verify everything works
   - This will check URL, credentials, folder access, and list files
   - All 5 tests should pass (see [TEST_CONNECTION_GUIDE.md](TEST_CONNECTION_GUIDE.md))
   
5. Once tests pass, click **Save & Connect**

### 4. Test the Connection

The Test Connection feature performs 5 checks:
1. ✓ Validates URL format
2. ✓ Tests connection to server
3. ✓ Verifies credentials
4. ✓ Checks/creates remote folder
5. ✓ Lists files in folder

If all tests pass, you'll see a green success message. If any fail, you'll get specific error messages to help troubleshoot.

### 5. First Sync

1. Click **Sync Now** to test the connection
2. If successful, you'll see sync statistics
3. Your local files will be uploaded to the Synology

## How Sync Works

### Conflict Resolution
- **Newer file wins**: The file with the most recent modification time is kept
- **Bidirectional**: Changes from both local and remote are synced
- **First sync**: All local files are uploaded to the server

### Auto-Sync
- Syncs automatically every 5 minutes (configurable via .env)
- Only syncs when changes are detected
- Runs in the background without interrupting your work

### Manual Sync
- Click **Sync Now** in settings anytime
- Useful after making many changes
- Shows upload/download statistics

## Environment Variables (Advanced)

Create a `.env` file in the JPad root directory for custom configuration:

```env
# WebDAV Server URL
VITE_WEBDAV_URL=https://your-synology.com:5006

# Credentials
VITE_WEBDAV_USERNAME=your-username
VITE_WEBDAV_PASSWORD=your-password

# Remote folder path
VITE_WEBDAV_PATH=/jpad-notes

# Auto-sync interval in seconds (0 to disable)
VITE_SYNC_INTERVAL=300
```

**Security Note:** The `.env` file is gitignored and stays local to your machine. Never commit credentials to version control.

## Troubleshooting

### Use Test Connection First!
Before troubleshooting, click **Test Connection** in settings. It will tell you exactly what's wrong:
- Step 1 fails → URL format issue
- Step 2 fails → Can't reach server (network/firewall)
- Step 3 fails → Wrong username/password
- Step 4 fails → Folder permission issue
- Step 5 fails → Can't list files

See [TEST_CONNECTION_GUIDE.md](TEST_CONNECTION_GUIDE.md) for detailed test information.

### Connection Failed
- Verify WebDAV is enabled on Synology
- Check firewall settings (port 5005/5006 must be open)
- Test URL in a browser: `http://your-nas:5005` should prompt for login
- For HTTPS, ensure you accept the self-signed certificate

### Sync Errors
- Check folder permissions on Synology
- Ensure the remote path exists or can be created
- Verify username/password are correct
- Check Synology logs: **Log Center** → **Connection**

### Files Not Syncing
- Check that files have the `.jt` extension
- Verify the notes directory: `~/Documents/jpad-notes`
- Look for error messages in the sync status
- Try manual sync first

### SSL Certificate Errors
If using HTTPS with a self-signed certificate:
1. Access the WebDAV URL in your browser first
2. Accept the security warning/certificate
3. Then configure JPad

## Multi-Device Setup

To sync across multiple devices:

1. Set up sync on the first device (follow steps above)
2. On the second device:
   - Install JPad
   - Configure the same WebDAV settings
   - Click **Sync Now** to download existing notes
3. Both devices will now stay in sync

**Important:** Don't edit the same file on multiple devices simultaneously. The last save wins.

## Alternative: File System Sync

If you prefer simpler file-based sync:

1. Mount your Synology shared folder as a network drive
2. Change JPad's notes directory to point to the mounted drive
3. All changes are instantly reflected on the NAS

**Windows:**
```
net use Z: \\your-nas\jpad-notes /user:username password
```

**macOS:**
```
Finder → Go → Connect to Server → smb://your-nas/jpad-notes
```

**Linux:**
```
mount -t cifs //your-nas/jpad-notes /mnt/jpad -o username=user,password=pass
```

Then in JPad, manually change the notes root to the mounted location.

## Security Best Practices

1. **Use HTTPS**: Always use port 5006 with HTTPS for external access
2. **Strong Passwords**: Use a strong, unique password for your Synology account
3. **Firewall**: Only open WebDAV ports if you need external access
4. **VPN**: Consider using a VPN instead of exposing WebDAV to the internet
5. **2FA**: Enable two-factor authentication on your Synology account
6. **Local .env**: Keep credentials in `.env` file, never commit to git

## FAQ

**Q: Can I use other WebDAV servers?**
A: Yes! Any WebDAV-compatible server works (Nextcloud, ownCloud, Apache, etc.)

**Q: What happens if sync fails?**
A: Local files are never deleted. Sync will retry on the next interval.

**Q: Can I sync to multiple servers?**
A: Currently, only one WebDAV server is supported at a time.

**Q: Is my data encrypted?**
A: Use HTTPS for encrypted transmission. Files are stored unencrypted on the server.

**Q: How much storage do I need?**
A: Text files are tiny. 1GB can store hundreds of thousands of notes.

## Support

For issues or questions:
- Check the error message in sync status
- Review Synology logs
- Ensure WebDAV is working with other clients first
- Open an issue on GitHub with error details
