// Utilidades para procesar la foto de un producto antes de guardarla.
//
// @react-pdf/renderer solo sabe dibujar JPG y PNG. La cámara/galería de un
// celular puede entregar cualquier cosa (WebP, HEIC, PNG de varios MB...),
// así que aquí decodificamos lo que sea, la redibujamos en un <canvas> a un
// tamaño razonable, y la volvemos a exportar SIEMPRE como JPEG. Eso
// garantiza que lo que llega al PDF sea un formato que sabe dibujar, y de
// paso el archivo pesa mucho menos.

const LADO_MAXIMO = 1000
const CALIDAD_JPEG = 0.7

// Tipos de imagen (mime, dentro de un data URL) que @react-pdf/renderer
// puede dibujar directamente.
export const TIPOS_IMAGEN_SOPORTADOS_EN_PDF = ['image/jpeg', 'image/png']

// ¿Este valor es un data URL de un tipo que el PDF sabe dibujar?
export function esImagenSoportadaEnPDF(dataUrl) {
  if (typeof dataUrl !== 'string') return false
  const m = /^data:([^;]+);base64,/i.exec(dataUrl)
  return !!m && TIPOS_IMAGEN_SOPORTADOS_EN_PDF.includes(m[1].toLowerCase())
}

// Convierte un File de imagen (cualquier formato que el navegador sepa
// decodificar) a un data URL JPEG, redimensionado para que ni el ancho ni
// el alto superen LADO_MAXIMO. Si el navegador no puede decodificarlo,
// lanza un Error con un mensaje pensado para mostrarlo tal cual al usuario.
export async function archivoAJpegDataUrl(archivo) {
  const fuente = await decodificarImagen(archivo)
  try {
    const anchoOriginal = fuente.naturalWidth || fuente.width
    const altoOriginal = fuente.naturalHeight || fuente.height

    if (!anchoOriginal || !altoOriginal) {
      throw new Error('La imagen se abrió pero no tiene contenido visible.')
    }

    const escala = Math.min(1, LADO_MAXIMO / Math.max(anchoOriginal, altoOriginal))
    const ancho = Math.max(1, Math.round(anchoOriginal * escala))
    const alto = Math.max(1, Math.round(altoOriginal * escala))

    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      throw new Error('El navegador no pudo preparar el lienzo para procesar la imagen.')
    }
    // Fondo blanco: si el origen tiene transparencia (PNG/WebP), un JPEG no
    // la soporta y quedaría negro sin esto.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, ancho, alto)
    ctx.drawImage(fuente, 0, 0, ancho, alto)

    const dataUrl = canvas.toDataURL('image/jpeg', CALIDAD_JPEG)
    if (!dataUrl || !dataUrl.startsWith('data:image/jpeg')) {
      throw new Error('El navegador no pudo exportar la imagen como JPEG.')
    }
    return dataUrl
  } finally {
    fuente.close?.() // libera memoria si es un ImageBitmap
  }
}

// Productos cuya foto no se pudo incluir en el PDF (formato no soportado
// por @react-pdf/renderer). Con el pipeline de arriba esto no debería
// pasar nunca con una foto recién elegida (siempre queda en JPEG), pero es
// un respaldo por si acaso — y así se avisa en vez de dejar la celda vacía
// sin explicación. Devuelve los números (1, 2, ...) de los productos
// afectados.
export function advertenciasDeFoto(productos) {
  return productos
    .map((p, i) => (p.foto && !esImagenSoportadaEnPDF(p.foto) ? i + 1 : null))
    .filter((n) => n !== null)
}

// Texto listo para mostrarle al usuario a partir de esos números (vacío si
// no hay ninguno).
export function textoAdvertenciaFoto(numerosDeProducto) {
  if (numerosDeProducto.length === 0) return ''
  const cuales =
    numerosDeProducto.length === 1
      ? `del producto ${numerosDeProducto[0]}`
      : `de los productos ${numerosDeProducto.join(', ')}`
  const plural = numerosDeProducto.length === 1 ? '' : 's'
  return ` Aviso: la${plural} foto${plural} ${cuales} no se pudo${plural} incluir en el PDF (formato no soportado).`
}

async function decodificarImagen(archivo) {
  // createImageBitmap es la vía más directa y la que mejor soporta formatos
  // como WebP. Si no está disponible o falla, se intenta con <img> como
  // respaldo (por ejemplo formatos raros o navegadores viejos).
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(archivo)
    } catch {
      // sigue con el respaldo de abajo
    }
  }

  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(
        new Error(
          `El navegador no pudo abrir este archivo como imagen (${archivo.type || 'formato desconocido'}).`,
        ),
      )
    }
    img.src = url
  })
}
