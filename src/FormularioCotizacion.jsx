import { useState } from 'react'
import { pdf } from '@react-pdf/renderer'
import CotizacionPDF from './CotizacionPDF'
import { supabase } from './supabaseClient'
import { normalizaDecimal, parseNumero } from './numeros'

// Primer número si la tabla está vacía.
const PRIMER_NUMERO = 232396

const GANANCIA_INICIAL = 30

function nuevoProducto() {
  return {
    descripcion: '',
    material: '',
    incluye: '',
    cantidad: '',
    costo: '',
    porcentajeGanancia: String(GANANCIA_INICIAL),
    valorUnitario: '',
    total: '',
    foto: null,
  }
}

// Lee un número del formulario aceptando "," o "." como separador decimal
// ("1,30" y "1.30" valen lo mismo). Si no hay número, devuelve 0.
function toNumber(valor) {
  return parseNumero(valor) ?? 0
}

function redondea(n) {
  return String(Math.round(n * 100) / 100)
}

// Para guardar en Supabase: convierte el string del formulario a número real
// (o null si está vacío / no es un número). No afecta cómo se ve el campo.
function aNumeroONull(valor) {
  if (valor === '' || valor == null) return null
  const n = Number(normalizaDecimal(valor))
  return Number.isFinite(n) ? n : null
}

// Un producto "vacío" es uno que el usuario agregó (con "+ Agregar
// producto") y todavía no llenó con nada. No cuenta el % Ganancia porque
// ese campo siempre trae un valor por defecto (30) aunque no se lo toque.
function productoEstaVacio(p) {
  const camposDeContenido = [
    p.descripcion,
    p.material,
    p.incluye,
    p.cantidad,
    p.costo,
    p.valorUnitario,
    p.total,
  ]
  const sinTexto = camposDeContenido.every((v) => v === '' || v == null)
  return sinTexto && !p.foto
}

// Solo para el PDF: se omiten los productos vacíos (el formulario los
// conserva tal cual, por si el usuario todavía los va a llenar).
function productosParaElPDF(productos) {
  return productos.filter((p) => !productoEstaVacio(p))
}

// Entrega el PDF ya generado al usuario. En celular, si el navegador
// soporta compartir archivos (Web Share API), abre el panel nativo de
// compartir/guardar. Si no (por ejemplo en computadora, o si falla por
// algo que no sea el usuario cancelando), cae a la descarga clásica.
async function entregarPDF(blob, numero) {
  const nombreArchivo = `cotizacion-${numero}.pdf`
  const archivo = new File([blob], nombreArchivo, { type: 'application/pdf' })

  const puedeCompartir =
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [archivo] })

  if (puedeCompartir) {
    try {
      await navigator.share({
        files: [archivo],
        title: `Cotización ${numero}`,
      })
      return
    } catch (error) {
      // El usuario cerró el panel de compartir sin elegir nada: no es un
      // error, no hace falta además descargar el archivo.
      if (error && error.name === 'AbortError') return
      // Cualquier otro problema (navegador raro, permisos, etc.): seguimos
      // con la descarga de siempre como respaldo.
    }
  }

  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}

// Aviso opcional por Telegram. Nunca lanza error: si algo falla (red,
// credenciales, respuesta de la API) simplemente no llega el mensaje y
// el resto del flujo (PDF + guardado) no se ve afectado.
async function notificarTelegram(numero, cliente, total) {
  try {
    const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID
    if (!botToken || !chatId) return

    const texto = `Nueva cotización ${numero} — Cliente: ${
      cliente || 'sin nombre'
    } — Total: $${total.toFixed(2)}`

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: texto }),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    // El aviso por Telegram es opcional; si falla no pasa nada.
  }
}

// A partir de la lista de "numero" ya guardados (formato "JS-XXXXXX"),
// devuelve el siguiente: el más alto + 1, o PRIMER_NUMERO si no hay ninguno.
function siguienteNumero(numerosGuardados) {
  let maximo = null
  for (const n of numerosGuardados) {
    const m = /^JS-(\d+)$/.exec(String(n ?? '').trim())
    if (!m) continue
    const valor = parseInt(m[1], 10)
    if (maximo === null || valor > maximo) maximo = valor
  }
  const siguiente = maximo === null ? PRIMER_NUMERO : maximo + 1
  return `JS-${siguiente}`
}

export default function FormularioCotizacion() {
  const [cliente, setCliente] = useState('')
  const [contacto, setContacto] = useState('')
  const [detalleGeneral, setDetalleGeneral] = useState('')
  const [productos, setProductos] = useState([nuevoProducto()])
  const [generandoPDF, setGenerandoPDF] = useState(false)
  const [mensaje, setMensaje] = useState(null) // { tipo: 'ok' | 'error', texto }

  async function generarCotizacion() {
    setGenerandoPDF(true)
    setMensaje(null)

    // 1) Calcular el número automático: el más alto ya guardado + 1.
    //    El mismo número va en el PDF y en la fila de Supabase.
    let numero
    try {
      const { data, error } = await supabase
        .from('cotizaciones')
        .select('numero')
      if (error) throw error
      numero = siguienteNumero((data || []).map((fila) => fila.numero))
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: `No se pudo calcular el número de cotización: ${error.message}`,
      })
      setGenerandoPDF(false)
      return
    }

    // 2) Generar y entregar el PDF (compartir en celular / descargar en
    //    escritorio). Esto ocurre pase lo que pase con el guardado en
    //    Supabase. Los productos vacíos (agregados pero sin llenar) no
    //    aparecen como filas en el PDF, aunque siguen en el formulario.
    try {
      const blob = await pdf(
        <CotizacionPDF
          numero={numero}
          cliente={cliente}
          contacto={contacto}
          detalleGeneral={detalleGeneral}
          productos={productosParaElPDF(productos)}
        />,
      ).toBlob()

      await entregarPDF(blob, numero)
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: `No se pudo generar el PDF: ${error.message}`,
      })
      setGenerandoPDF(false)
      return
    }

    // 3) Guardar el registro en Supabase (independiente de la descarga).
    //    Los campos numéricos de cada producto se guardan como números reales.
    try {
      const productosParaGuardar = productos.map((p) => ({
        ...p,
        cantidad: aNumeroONull(p.cantidad),
        costo: aNumeroONull(p.costo),
        porcentajeGanancia: aNumeroONull(p.porcentajeGanancia),
        valorUnitario: aNumeroONull(p.valorUnitario),
        total: aNumeroONull(p.total),
      }))

      const { error } = await supabase.from('cotizaciones').insert({
        numero,
        cliente,
        contacto,
        detalle: detalleGeneral,
        fecha: new Date().toISOString().slice(0, 10),
        productos: productosParaGuardar,
        estado: 'Nueva',
      })
      if (error) throw error
      setMensaje({ tipo: 'ok', texto: `Cotización ${numero} guardada` })

      // 4) Aviso por Telegram. Es opcional: si falla, el usuario no ve
      //    ningún error (el PDF ya se descargó y la cotización ya se guardó).
      const totalCotizacion = productos.reduce(
        (suma, p) => suma + toNumber(p.total),
        0,
      )
      await notificarTelegram(numero, cliente, totalCotizacion)
    } catch (error) {
      setMensaje({
        tipo: 'error',
        texto: `El PDF se descargó, pero no se pudo guardar en Supabase: ${error.message}`,
      })
    } finally {
      setGenerandoPDF(false)
    }
  }

  function agregarProducto() {
    setProductos((prev) => [...prev, nuevoProducto()])
  }

  function quitarProducto(index) {
    setProductos((prev) => prev.filter((_, i) => i !== index))
  }

  function duplicarProducto(index) {
    setProductos((prev) => {
      const copia = [...prev]
      copia.splice(index + 1, 0, { ...prev[index] })
      return copia
    })
  }

  function elegirFoto(index, archivo, inputEl) {
    if (!archivo) return
    const lector = new FileReader()
    lector.onload = () => {
      actualizarProducto(index, 'foto', lector.result)
      if (inputEl) inputEl.value = ''
    }
    lector.readAsDataURL(archivo)
  }

  function quitarFoto(index) {
    actualizarProducto(index, 'foto', null)
  }

  function actualizarProducto(index, campo, valor) {
    setProductos((prev) =>
      prev.map((producto, i) => {
        if (i !== index) return producto

        const p = { ...producto, [campo]: valor }

        if (campo === 'costo' || campo === 'porcentajeGanancia') {
          const vu = toNumber(p.costo) * (1 + toNumber(p.porcentajeGanancia) / 100)
          p.valorUnitario = p.costo === '' ? '' : redondea(vu)
          p.total = redondea(toNumber(p.cantidad) * toNumber(p.valorUnitario))
        } else if (campo === 'total') {
          const cantidad = toNumber(p.cantidad)
          if (cantidad !== 0) {
            p.valorUnitario = redondea(toNumber(p.total) / cantidad)
          }
        } else if (campo === 'valorUnitario') {
          p.total = redondea(toNumber(p.cantidad) * toNumber(p.valorUnitario))
        } else if (campo === 'cantidad') {
          p.total = redondea(toNumber(p.cantidad) * toNumber(p.valorUnitario))
        }

        return p
      }),
    )
  }

  return (
    <form onSubmit={(e) => e.preventDefault()}>
      <label>
        Cliente
        <input
          type="text"
          value={cliente}
          onChange={(e) => setCliente(e.target.value)}
        />
      </label>

      <label>
        Contacto
        <input
          type="text"
          value={contacto}
          onChange={(e) => setContacto(e.target.value)}
        />
      </label>

      <label>
        Detalle general
        <input
          type="text"
          value={detalleGeneral}
          onChange={(e) => setDetalleGeneral(e.target.value)}
        />
      </label>

      <section className="productos">
        <div className="productos-header">
          <h2>Productos</h2>
          <button type="button" onClick={agregarProducto}>
            + Agregar producto
          </button>
        </div>

        {productos.length === 0 && (
          <p className="vacio">No hay productos. Agrega uno para empezar.</p>
        )}

        {productos.map((producto, index) => (
          <div className="producto" key={index}>
            <label>
              Descripción
              <input
                type="text"
                value={producto.descripcion}
                onChange={(e) =>
                  actualizarProducto(index, 'descripcion', e.target.value)
                }
              />
            </label>

            <label>
              Material
              <input
                type="text"
                value={producto.material}
                onChange={(e) =>
                  actualizarProducto(index, 'material', e.target.value)
                }
              />
            </label>

            <label>
              Incluye
              <input
                type="text"
                value={producto.incluye}
                onChange={(e) =>
                  actualizarProducto(index, 'incluye', e.target.value)
                }
              />
            </label>

            <label>
              Cantidad
              <input
                type="number"
                value={producto.cantidad}
                onChange={(e) =>
                  actualizarProducto(index, 'cantidad', e.target.value)
                }
              />
            </label>

            <label>
              Costo
              <input
                type="text"
                inputMode="decimal"
                value={producto.costo}
                onChange={(e) =>
                  actualizarProducto(index, 'costo', e.target.value)
                }
              />
            </label>

            <label>
              % Ganancia
              <input
                type="text"
                inputMode="decimal"
                value={producto.porcentajeGanancia}
                onChange={(e) =>
                  actualizarProducto(index, 'porcentajeGanancia', e.target.value)
                }
              />
            </label>

            <label>
              Valor Unitario
              <input
                type="text"
                inputMode="decimal"
                value={producto.valorUnitario}
                onChange={(e) =>
                  actualizarProducto(index, 'valorUnitario', e.target.value)
                }
              />
            </label>

            <label>
              Total del producto
              <input
                type="text"
                inputMode="decimal"
                value={producto.total}
                onChange={(e) =>
                  actualizarProducto(index, 'total', e.target.value)
                }
              />
            </label>

            <div className="producto-foto">
              {producto.foto ? (
                <div className="foto-preview">
                  <img
                    src={producto.foto}
                    alt={`Vista previa del producto ${index + 1}`}
                  />
                  <button
                    type="button"
                    className="quitar"
                    onClick={() => quitarFoto(index)}
                  >
                    Quitar foto
                  </button>
                </div>
              ) : (
                <div className="foto-botones">
                  {/* Inputs de archivo REALES y VISIBLES (sin <label> ni
                      `hidden` + click() por JS): el toque cae directo sobre
                      el input, así ningún navegador tiene que "adivinar".
                      El texto del botón nativo lo pone el navegador; el
                      título de arriba dice cuál es cuál. */}
                  <div className="foto-opcion">
                    <span className="foto-opcion-titulo">Tomar foto</span>
                    {/* Con `capture`: abre directo la cámara. */}
                    <input
                      type="file"
                      className="foto-input"
                      accept="image/*"
                      capture="environment"
                      aria-label="Tomar foto"
                      onChange={(e) =>
                        elegirFoto(index, e.target.files[0], e.target)
                      }
                    />
                  </div>
                  <div className="foto-opcion">
                    <span className="foto-opcion-titulo">Elegir de galería</span>
                    {/* Sin `capture`: abre el selector de archivos/galería. */}
                    <input
                      type="file"
                      className="foto-input"
                      accept="image/*"
                      aria-label="Elegir de galería"
                      onChange={(e) =>
                        elegirFoto(index, e.target.files[0], e.target)
                      }
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="producto-acciones">
              <button type="button" onClick={() => duplicarProducto(index)}>
                Duplicar producto
              </button>
              <button
                type="button"
                className="quitar"
                onClick={() => quitarProducto(index)}
              >
                Quitar producto
              </button>
            </div>
          </div>
        ))}
      </section>

      <button
        type="button"
        className="generar-pdf"
        onClick={generarCotizacion}
        disabled={generandoPDF}
      >
        {generandoPDF ? 'Generando…' : 'Generar cotización (vista previa)'}
      </button>

      {mensaje && (
        <p
          className={mensaje.tipo === 'ok' ? 'mensaje-ok' : 'mensaje-error'}
          role="status"
        >
          {mensaje.texto}
        </p>
      )}
    </form>
  )
}
