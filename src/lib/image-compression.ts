// Compresión de imágenes en el navegador, sin dependencias.
//
// Por qué existe: subir la foto de prueba de entrega desde el celular fallaba.
// Las fotos de celular pesan 3-8 MB y el límite de body de la plataforma
// (Vercel ~4.5 MB) rechaza el request antes de llegar al handler. Comprimimos
// del lado del cliente para que la imagen quede siempre por debajo del límite.
//
// Usa createImageBitmap con imageOrientation: "from-image" para respetar la
// orientación EXIF (si no, las fotos verticales de celular salen rotadas).

interface CompressOptions {
  /** Lado máximo (px). Se reescala manteniendo aspect ratio. */
  maxDimension?: number;
  /** Tamaño objetivo en bytes. Baja la calidad hasta acercarse. */
  targetBytes?: number;
  /** Calidad JPEG inicial (0-1). */
  initialQuality?: number;
}

const DEFAULTS: Required<CompressOptions> = {
  maxDimension: 1600,
  targetBytes: 1_500_000, // ~1.5 MB
  initialQuality: 0.8,
};

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Comprime una imagen a JPEG. Si el archivo no es imagen, el navegador no
 * soporta las APIs necesarias, o algo falla, devuelve el archivo original
 * para no bloquear el flujo de entrega.
 */
export async function compressImage(
  file: File | Blob,
  opts: CompressOptions = {},
): Promise<Blob> {
  const { maxDimension, targetBytes, initialQuality } = { ...DEFAULTS, ...opts };

  const isImage = file.type.startsWith("image/");
  if (
    typeof document === "undefined" ||
    typeof createImageBitmap !== "function" ||
    !isImage
  ) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });

    const scale = Math.min(
      1,
      maxDimension / Math.max(bitmap.width, bitmap.height),
    );
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    // Bajamos calidad progresivamente hasta acercarnos al objetivo.
    let best: Blob | null = null;
    for (const quality of [initialQuality, 0.6, 0.45]) {
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (!blob) continue;
      best = blob;
      if (blob.size <= targetBytes) break;
    }

    // Si por lo que sea quedó más grande que el original, devolvemos el original.
    if (!best || best.size >= file.size) return file;
    return best;
  } catch {
    return file;
  }
}
