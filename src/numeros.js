// Utilidades para leer números escritos por el usuario, que puede usar
// coma o punto como separador decimal ("1,30" o "1.30").

// Devuelve el texto listo para convertirlo con Number()/parseFloat(),
// usando siempre "." como separador decimal.
//  - "1,30"      -> "1.30"
//  - "1.30"      -> "1.30"
//  - "1.250,50"  -> "1250.50"   (si hay coma y punto, el que aparece al
//  - "1,250.50"  -> "1250.50"    final es el decimal y el otro es de miles)
export function normalizaDecimal(valor) {
  let s = String(valor ?? '')
    .trim()
    .replace(/\s/g, '')
  const coma = s.lastIndexOf(',')
  const punto = s.lastIndexOf('.')

  if (coma !== -1 && punto !== -1) {
    s = coma > punto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '')
  } else if (coma !== -1) {
    s = s.replace(/,/g, '.')
  }
  return s
}

// Número leído de forma tolerante (como parseFloat), o null si no hay número.
export function parseNumero(valor) {
  const n = parseFloat(normalizaDecimal(valor))
  return Number.isFinite(n) ? n : null
}
