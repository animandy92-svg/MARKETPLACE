import { execFileSync } from 'node:child_process';
import { readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// Run only when publishing an Android update has been authorized.
// Reuse Git's credential manager; never print or write its credential.
const repo = 'animandy92-svg/MARKETPLACE';
const pubspec = await readFile(new URL('../mobile/pubspec.yaml', import.meta.url), 'utf8');
const version = pubspec.match(/^version: (\d+\.\d+\.\d+)\+\d+$/m)?.[1];
if (!version) throw new Error('A semantic app version and build number are required');
const tag = `v${version}`;
const mode = process.argv[2];
if (!['--inspect', '--publish'].includes(mode)) throw new Error('Use --inspect or --publish');
let credentials;
try {
  credentials = execFileSync('git', ['credential', 'fill'], {
    input: 'protocol=https\nhost=github.com\n\n', encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch { throw new Error('GitHub authentication is unavailable'); }
const token = credentials.split('\n').find(line => line.startsWith('password='))?.slice(9).trim();
if (!token) throw new Error('GitHub authentication is unavailable');
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'marketplace-apk-release', 'X-GitHub-Api-Version': '2022-11-28' };
async function api(route, options = {}) {
  const response = await fetch(`https://api.github.com/repos/${repo}${route}`, {
    ...options, headers: { ...headers, 'Content-Type': 'application/json', ...options.headers }, signal: AbortSignal.timeout(60000),
  });
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok && response.status !== 404) throw new Error(`GitHub API returned ${response.status}: ${data.message || 'request failed'}`);
  return { status: response.status, data };
}
const info = await api('');
if (info.status !== 200 || info.data.private) throw new Error('A public repository is required for a public APK download');
let release = await api(`/releases/tags/${tag}`);
if (release.status === 404) {
  // A failed upload may leave a draft that the tag endpoint does not return.
  const releases = await api('/releases?per_page=100');
  const draft = releases.data.find(item => item.tag_name === tag && item.draft);
  if (draft) release = { status: 200, data: draft };
}
if (mode === '--inspect') {
  console.log(JSON.stringify({ repository: info.data.html_url, public: true, release: release.status === 200 ? release.data.html_url : null,
    draft: release.data.draft, assets: release.data.assets?.map(asset => ({ name: asset.name, size: asset.size, state: asset.state })) }));
} else {
  const notes = await readFile(new URL(`../docs/releases/${version}.md`, import.meta.url), 'utf8');
  if (release.status === 404) release = await api('/releases', { method: 'POST', body: JSON.stringify({
    tag_name: tag, target_commitish: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    name: `Jack of All Trades · Android ${version} (testing)`, body: notes, draft: true, prerelease: true,
  }) });
  if (release.data.draft) {
    release = await api(`/releases/${release.data.id}`, { method: 'PATCH', body: JSON.stringify({
      body: notes, name: `Jack of All Trades · Android ${version} (testing)`,
      target_commitish: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    }) });
  }
  for (const name of [`jack-of-all-trades-${version}.apk`, `jack-of-all-trades-${version}.sha256`]) {
    const filename = path.resolve('artifacts', name), { size } = await stat(filename);
    const existing = release.data.assets?.find(asset => asset.name === name);
    if (existing) {
      const hash = createHash('sha256');
      for await (const chunk of createReadStream(filename)) hash.update(chunk);
      if (existing.size === size && existing.digest === 'sha256:' + hash.digest('hex')) continue;
      if (!release.data.draft) throw new Error(`Release asset ${name} differs; review it before replacing a published build`);
      // Only replace assets in our unpublished draft; published APKs stay immutable.
      await api(`/releases/assets/${existing.id}`, { method: 'DELETE' });
    }
    const url = release.data.upload_url.replace(/\{.*$/, '') + '?name=' + encodeURIComponent(name);
    console.log(`Uploading ${name} (${(size / 1024 / 1024).toFixed(1)} MB)`);
    const response = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/octet-stream', 'Content-Length': String(size) },
      body: createReadStream(filename), duplex: 'half', signal: AbortSignal.timeout(600000) });
    if (!response.ok) throw new Error(`GitHub asset upload returned ${response.status}`);
    await response.json();
  }
  if (release.data.draft) await api(`/releases/${release.data.id}`, { method: 'PATCH', body: JSON.stringify({ draft: false }) });
  const published = await api(`/releases/${release.data.id}`);
  if (published.status !== 200 || published.data.draft || published.data.tag_name !== tag) throw new Error('Release publication needs review');
  console.log(JSON.stringify({ release: published.data.html_url, assets: published.data.assets.map(asset => ({
    name: asset.name, size: asset.size, digest: asset.digest, url: asset.browser_download_url,
  })) }));
}
