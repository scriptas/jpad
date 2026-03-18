# Test Connection Feature Guide

## What It Does

The "Test Connection" button performs a comprehensive 5-step verification of your WebDAV setup:

### Step-by-Step Tests

1. **✓ Validating URL format**
   - Checks if URL starts with `http://` or `https://`
   - Validates basic URL structure
   - **Pass**: "URL format is valid"
   - **Fail**: "Invalid URL format. Must start with http:// or https://"

2. **✓ Testing connection**
   - Attempts to connect to the WebDAV server
   - Verifies the server is reachable
   - **Pass**: "Successfully connected to WebDAV server"
   - **Fail**: "Connection failed: [error details]"
   - Common failures:
     - Network unreachable
     - Wrong port
     - Server not running
     - Firewall blocking

3. **✓ Verifying credentials**
   - Tests username and password
   - Attempts to list root directory
   - **Pass**: "Credentials are valid"
   - **Fail**: "Authentication failed. Check username/password"
   - Common failures:
     - Wrong username
     - Wrong password
     - Account disabled
     - Insufficient permissions

4. **✓ Checking remote folder**
   - Checks if `/jpad-notes` (or your path) exists
   - Creates it if it doesn't exist
   - **Pass (exists)**: "Folder exists: /jpad-notes"
   - **Pass (created)**: "Folder created: /jpad-notes"
   - **Fail**: "Failed to access/create folder: [error]"
   - Common failures:
     - No write permissions
     - Invalid path
     - Parent directory doesn't exist

5. **✓ Listing files**
   - Lists all files in the remote folder
   - Counts how many files are present
   - **Pass (empty)**: "Folder is empty (ready for first sync)"
   - **Pass (has files)**: "Found X file(s) in remote folder"
   - **Fail**: "Failed to list files: [error]"

## How to Use

### Before Testing
1. Fill in all fields:
   - WebDAV Server URL: `https://serum.quickconnect.to:5006`
   - Username: `tony`
   - Password: `••••••••`
   - Remote Path: `/jpad-notes`

2. Click **"Test Connection"** button

### During Test
- Each step shows a spinner while testing
- Steps complete one by one (takes ~2 seconds total)
- You'll see real-time progress

### After Test

**All Tests Passed ✓**
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

[Green box]
✓ All tests passed! You can now save and start syncing.
```

**Test Failed ✗**
```
✓ Validating URL format
  URL format is valid

✓ Testing connection
  Successfully connected to WebDAV server

✗ Verifying credentials
  Authentication failed. Check username/password

⊘ Checking remote folder
  (not tested - previous step failed)

⊘ Listening files
  (not tested - previous step failed)

[Red box]
✗ Connection test failed
  Please fix the errors above and try again.
```

## Common Issues & Solutions

### Issue: "Connection failed: Network error"
**Solutions:**
- Check if URL is correct
- Verify WebDAV Server is running on Synology
- Check port number (5005 for HTTP, 5006 for HTTPS)
- Try accessing URL in browser first
- Check firewall settings

### Issue: "Authentication failed"
**Solutions:**
- Double-check username (case-sensitive)
- Verify password is correct
- Try logging into Synology web interface with same credentials
- Check if account is enabled
- Verify account has WebDAV permissions

### Issue: "Failed to access/create folder"
**Solutions:**
- Check if user has write permissions
- Verify path format (should start with `/`)
- Try a simpler path like `/test`
- Check if parent directories exist
- Look at Synology logs for permission errors

### Issue: "Failed to list files"
**Solutions:**
- Check folder permissions
- Verify user can read the folder
- Try accessing folder via web browser
- Check Synology logs

## Testing Your Setup

### Test 1: Basic Connection
```
URL: https://serum.quickconnect.to:5006
Username: tony
Password: [your password]
Remote Path: /jpad-notes
```
Click "Test Connection" - should pass all 5 steps

### Test 2: Wrong Password
```
URL: https://serum.quickconnect.to:5006
Username: tony
Password: wrongpassword
Remote Path: /jpad-notes
```
Should fail at step 3 (Verifying credentials)

### Test 3: Invalid URL
```
URL: not-a-url
Username: tony
Password: [your password]
Remote Path: /jpad-notes
```
Should fail at step 1 (Validating URL format)

### Test 4: Wrong Port
```
URL: https://serum.quickconnect.to:9999
Username: tony
Password: [your password]
Remote Path: /jpad-notes
```
Should fail at step 2 (Testing connection)

## After Successful Test

Once all tests pass:
1. Click **"Save & Connect"** to enable sync
2. Click **"Sync Now"** to perform first sync
3. Your local files will be uploaded to Synology
4. Auto-sync will start (every 5 minutes)

## Troubleshooting Tips

1. **Always test connection before saving**
   - Catches configuration errors early
   - Provides specific error messages
   - Saves time debugging

2. **Test in browser first**
   - Open `https://serum.quickconnect.to:5006` in browser
   - Should prompt for username/password
   - If browser can't connect, JPad won't either

3. **Check Synology logs**
   - Log Center → Connection
   - Look for WebDAV authentication failures
   - Check for permission errors

4. **Start simple**
   - Test with HTTP first (port 5005)
   - Once working, switch to HTTPS (port 5006)
   - Use simple path like `/test` first

5. **Verify WebDAV is running**
   - Synology → Package Center → WebDAV Server
   - Should show "Running" status
   - Check port configuration

## Visual Indicators

- **Spinner** (⟳): Test in progress
- **Green checkmark** (✓): Test passed
- **Red X** (✗): Test failed
- **Gray circle** (⊘): Test skipped (previous step failed)

## Next Steps

After successful test:
1. Save configuration
2. Perform first sync
3. Check sync status
4. Verify files on Synology
5. Test from another device

---

**Pro Tip**: Run the test connection every time you change settings to ensure everything still works!
