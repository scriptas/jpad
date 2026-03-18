# JPad Quick Reference

## Cloud Sync Setup (5 Minutes)

### On Synology NAS:
1. Control Panel → File Services → WebDAV tab
2. Enable WebDAV (HTTPS recommended)
3. Note the port (usually 5006 for HTTPS)

### In JPad:
1. Settings → Cloud Sync
2. Enter:
   - URL: `https://your-nas-ip:5006`
   - Username: Your Synology username
   - Password: Your Synology password
   - Path: `/jpad-notes`
3. Click "Save & Connect"
4. Click "Sync Now"

Done! Your notes are now syncing.

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| New Note | `Ctrl+N` | `Cmd+N` |
| Search | `Ctrl+F` | `Cmd+F` |
| Save | `Ctrl+S` | `Cmd+S` |
| Settings | `Ctrl+,` | `Cmd+,` |
| Toggle Sidebar | Click FAB | Click FAB |

## Vim Mode (Beta)

Enable in Settings → Vim Mode

### Basic Commands:
- `i` - Insert mode
- `Esc` - Normal mode
- `h/j/k/l` - Navigate left/down/up/right
- `dd` - Delete line
- `yy` - Copy line
- `p` - Paste
- `u` - Undo
- `Ctrl+r` - Redo
- `:%y+` - Copy entire file to clipboard

## File Management

- **Create File**: Right-click folder → New File
- **Create Folder**: Right-click → New Folder
- **Rename**: Right-click → Rename
- **Delete**: Right-click → Delete
- **Reveal in Explorer**: Right-click → Reveal in Explorer

## Rich Text Features

- **Bold**: `Ctrl/Cmd+B`
- **Italic**: `Ctrl/Cmd+I`
- **Underline**: `Ctrl/Cmd+U`
- **Heading**: `Ctrl/Cmd+Alt+1-6`
- **Bullet List**: `Ctrl/Cmd+Shift+8`
- **Numbered List**: `Ctrl/Cmd+Shift+7`
- **Code Block**: `Ctrl/Cmd+Alt+C`
- **Quote**: `Ctrl/Cmd+Shift+B`

## Images & Media

- **Drag & Drop**: Drag image files into editor
- **Paste**: Copy image and paste with `Ctrl/Cmd+V`
- **YouTube**: Paste YouTube URL and press Enter

## Themes

Settings → Appearance

- Choose from 6 built-in themes
- Create custom themes
- Duplicate and modify existing themes
- Live preview while editing

## Sync Behavior

- **Auto-sync**: Every 5 minutes (configurable)
- **Manual sync**: Settings → Cloud Sync → Sync Now
- **Conflict resolution**: Newer file wins
- **First sync**: All local files uploaded

## File Storage

- **Location**: `~/Documents/jpad-notes`
- **Format**: `.jt` files (JSON-based rich text)
- **Portable**: Copy folder to backup/move notes

## Troubleshooting

### Sync not working?
1. Check WebDAV is enabled on Synology
2. Test URL in browser (should prompt for login)
3. Verify credentials
4. Check firewall/port forwarding

### Files not appearing?
1. Click refresh in sidebar
2. Check file extension is `.jt`
3. Verify notes directory location

### Theme not applying?
1. Close and reopen settings
2. Select theme again
3. Restart JPad

## Tips & Tricks

1. **Quick Note**: `Ctrl/Cmd+N` creates a timestamped note instantly
2. **Search Everything**: `Ctrl/Cmd+F` searches both filenames and content
3. **Organize**: Use folders to categorize notes by project/topic
4. **Backup**: Your notes are just files - copy `~/Documents/jpad-notes` to backup
5. **Multi-Device**: Set up sync on each device with same credentials
6. **Privacy**: Use `.env` file for credentials (never committed to git)

## Support

- Documentation: See `SYNC_SETUP.md` for detailed sync guide
- Issues: Report bugs on GitHub
- Logs: Check Synology Log Center for WebDAV errors
