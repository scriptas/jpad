import { fetch } from '@tauri-apps/plugin-http';

const GITHUB_API_URL = 'https://api.github.com/repos/scriptas/jpad/releases/latest';
const CURRENT_VERSION = '2.3.4'; // Must match package.json / tauri.conf.json

export interface ReleaseInfo {
    version: string;       // e.g. "2.2.0"
    tagName: string;       // e.g. "v2.2.0"
    name: string;          // e.g. "JPad v2.2.0"
    body: string;          // Release notes markdown
    htmlUrl: string;       // Link to release page
    publishedAt: string;   // ISO date
    assets: ReleaseAsset[];
}

export interface ReleaseAsset {
    name: string;
    downloadUrl: string;
    size: number;
    contentType: string;
}

/**
 * Compare two semver version strings (e.g. "2.1.0" vs "2.2.0").
 * Returns true if `remote` is newer than `current`.
 */
function isNewerVersion(current: string, remote: string): boolean {
    const c = current.split('.').map(Number);
    const r = remote.split('.').map(Number);
    for (let i = 0; i < Math.max(c.length, r.length); i++) {
        const cv = c[i] || 0;
        const rv = r[i] || 0;
        if (rv > cv) return true;
        if (rv < cv) return false;
    }
    return false;
}

/**
 * Fetch the latest release info from GitHub.
 */
export async function checkForUpdate(): Promise<{ hasUpdate: boolean; release: ReleaseInfo | null }> {
    const response = await fetch(GITHUB_API_URL, {
        method: 'GET',
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'JPad-UpdateChecker',
        },
    });

    if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`);
    }

    const data = await response.json() as any;

    // Extract version from tag_name (e.g. "v2.2.0" -> "2.2.0")
    const tagName: string = data.tag_name || '';
    const version = tagName.replace(/^v/, '');

    if (!version) {
        throw new Error('Invalid release data from GitHub (no tag_name found)');
    }

    const release: ReleaseInfo = {
        version,
        tagName,
        name: data.name || `JPad ${tagName}`,
        body: data.body || '',
        htmlUrl: data.html_url || '',
        publishedAt: data.published_at || '',
        assets: (data.assets || []).map((a: any) => ({
            name: a.name,
            downloadUrl: a.browser_download_url,
            size: a.size,
            contentType: a.content_type,
        })),
    };

    const hasUpdate = isNewerVersion(CURRENT_VERSION, version);

    return { hasUpdate, release };
}

/**
 * Get the current app version.
 */
export function getCurrentVersion(): string {
    return CURRENT_VERSION;
}

/**
 * Find the appropriate download asset for the current platform.
 */
export function getAssetForPlatform(assets: ReleaseAsset[], currentPlatform: string): ReleaseAsset | null {
    const find = (pattern: RegExp) => assets.find(a => pattern.test(a.name)) || null;

    switch (currentPlatform) {
        case 'linux':
            // Prefer AppImage for easiest self-updating on Linux
            return find(/\.AppImage$/i) || find(/\.deb$/i) || find(/\.rpm$/i);
        case 'macos':
            return find(/\.dmg$/i);
        case 'windows':
            return find(/_x64-setup\.exe$/i) || find(/\.msi$/i);
        default:
            return null;
    }
}
