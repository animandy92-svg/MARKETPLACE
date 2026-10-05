// Keep pilot photos small enough for a single Firestore listing, including on mobile data.
export async function compressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024) throw new Error('Choose a photo smaller than 20 MB');
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Photo upload is not supported by this browser');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [.82, .65, .48, .3]) {
      const data = canvas.toDataURL('image/jpeg', quality);
      if (data.length <= 460000) return data;
    }
    throw new Error('This photo is too detailed. Try a smaller photo.');
  } finally { bitmap.close(); }
}
