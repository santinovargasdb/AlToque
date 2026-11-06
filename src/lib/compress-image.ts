const TARGET_BYTES = 900 * 1024;
const MAX_SIDE_PX = 1600;
const QUALITIES = [0.8, 0.65, 0.5];

function toJpegBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
}

/**
 * Achica una foto en el navegador antes de subirla (solo del lado del cliente).
 * Lo que no pueda comprimir (PDF, formato que el navegador no decodifica) o que
 * no valga la pena lo devuelve tal cual: el control de peso total se hace después.
 */
export async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= TARGET_BYTES) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  // JPEG no tiene transparencia: sin fondo, un PNG quedaría con zonas negras.
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let blob: Blob | null = null;
  for (const quality of QUALITIES) {
    blob = await toJpegBlob(canvas, quality);
    if (blob && blob.size <= TARGET_BYTES) break;
  }
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg" });
}
