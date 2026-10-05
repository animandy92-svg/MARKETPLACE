import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { Resvg } from '@resvg/resvg-js';

// Use the shopping bags directly from the website's logo as the app mark.
const source = await readFile(new URL('../public/logo.svg', import.meta.url), 'utf8');
const bags = source.match(/<g[^>]*>([\s\S]*?)<\/g>/)?.[1];
if (!bags) throw new Error('The project logo shopping bags were not found');
const svg = (background, inset = 0) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${background ? '<rect width="64" height="64" fill="white"/>' : ''}<g transform="translate(${inset},${inset}) scale(${(64 - inset * 2) / 64})"><g transform="translate(5,6)">${bags}</g></g></svg>`;
const brand = svg(true);
const foreground = svg(false, 12);
const root = new URL('../', import.meta.url);
async function png(file, size, vector = brand) {
  const url = new URL(file, root);
  await mkdir(new URL('.', url), { recursive: true });
  await writeFile(url, new Resvg(vector, { fitTo: { mode: 'width', value: size } }).render().asPng());
}
await mkdir(new URL('mobile/assets/', root), { recursive: true });
await writeFile(new URL('mobile/assets/brand-icon.svg', root), brand);
await png('mobile/assets/brand-icon.png', 1024);
for (const [density, size] of [['mdpi', 48], ['hdpi', 72], ['xhdpi', 96], ['xxhdpi', 144], ['xxxhdpi', 192]]) {
  await png(`mobile/android/app/src/main/res/mipmap-${density}/ic_launcher.png`, size);
  await png(`mobile/android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.png`, size * 108 / 48, foreground);
}
const icons = JSON.parse(await readFile(new URL('mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json', root), 'utf8'));
for (const icon of icons.images) {
  if (icon.filename) await png(`mobile/ios/Runner/Assets.xcassets/AppIcon.appiconset/${icon.filename}`, Number(icon.size.split('x')[0]) * Number(icon.scale.replace('x', '')));
}
const signInPage = await readFile(new URL('src/app/pages/SignInPage.tsx', root), 'utf8');
const googlePaths = signInPage.match(/<svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">([\s\S]*?)<\/svg>/)?.[1];
if (!googlePaths) throw new Error('The Google sign-in mark was not found');
await png('mobile/assets/google-mark.png', 96, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${googlePaths}</svg>`);
console.log('Generated branded Android and iOS app icons and mobile sign-in assets.');
