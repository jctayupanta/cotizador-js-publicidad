import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const ESTADOS = ['Nueva', 'Contactado', 'Ganada', 'Perdida']

function DetalleCotizacion({ cotizacion, onVolver, onEstadoActualizado }) {
  const productos = Array.isArray(cotizacion.productos) ? cotizacion.productos : []

  const [estado, setEstado] = useState(cotizacion.estado || 'Nueva')
  const [guardandoEstado, setGuardandoEstado] = useState(false)
  const [mensajeEstado, setMensajeEstado] = useState(null) // { tipo, texto }

  async function cambiarEstado(nuevoEstado) {
    const anterior = estado
    setEstado(nuevoEstado) // optimista: se ve el cambio de inmediato
    setGuardandoEstado(true)
    setMensajeEstado(null)

    const { error } = await supabase
      .from('cotizaciones')
      .update({ estado: nuevoEstado })
      .eq('id', cotizacion.id)

    setGuardandoEstado(false)

    if (error) {
      setEstado(anterior) // revertir si falló
      setMensajeEstado({
        tipo: 'error',
        texto: `No se pudo actualizar el estado: ${error.message}`,
      })
      return
    }

    setMensajeEstado({ tipo: 'ok', texto: 'Estado actualizado' })
    // Avisar a la lista para que la tarjeta refleje el cambio sin recargar.
    onEstadoActualizado(cotizacion.id, nuevoEstado)
  }

  return (
    <div className="detalle">
      <button type="button" className="volver" onClick={onVolver}>
        ← Volver
      </button>

      <h2>Cotización {cotizacion.numero}</h2>

      <dl className="detalle-datos">
        <div>
          <dt>Cliente</dt>
          <dd>{cotizacion.cliente || '—'}</dd>
        </div>
        <div>
          <dt>Contacto</dt>
          <dd>{cotizacion.contacto || '—'}</dd>
        </div>
        <div>
          <dt>Fecha</dt>
          <dd>{cotizacion.fecha || '—'}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>
            <select
              className="detalle-estado-select"
              value={estado}
              disabled={guardandoEstado}
              onChange={(e) => cambiarEstado(e.target.value)}
            >
              {ESTADOS.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            {mensajeEstado && (
              <span
                className={
                  mensajeEstado.tipo === 'ok' ? 'mensaje-ok' : 'mensaje-error'
                }
                role="status"
              >
                {mensajeEstado.texto}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt>Detalle</dt>
          <dd>{cotizacion.detalle || '—'}</dd>
        </div>
      </dl>

      <h3>Productos ({productos.length})</h3>
      {productos.length === 0 && <p className="vacio">Sin productos.</p>}

      {productos.map((p, i) => (
        <div className="detalle-producto" key={i}>
          <p className="detalle-producto-titulo">
            {i + 1}. {p.descripcion || '(sin descripción)'}
          </p>
          {p.material ? (
            <p>
              <strong>Material:</strong> {p.material}
            </p>
          ) : null}
          {p.incluye ? (
            <p>
              <strong>Incluye:</strong> {p.incluye}
            </p>
          ) : null}
          <ul className="detalle-producto-numeros">
            <li>
              <span>Cantidad</span>
              <span>{p.cantidad ?? '—'}</span>
            </li>
            <li>
              <span>Costo</span>
              <span>{p.costo ?? '—'}</span>
            </li>
            <li>
              <span>% Ganancia</span>
              <span>{p.porcentajeGanancia ?? '—'}</span>
            </li>
            <li>
              <span>Valor Unitario</span>
              <span>{p.valorUnitario ?? '—'}</span>
            </li>
            <li>
              <span>Total</span>
              <span>{p.total ?? '—'}</span>
            </li>
          </ul>
          {p.foto ? (
            <img
              className="detalle-producto-foto"
              src={p.foto}
              alt={`Foto del producto ${i + 1}`}
            />
          ) : null}
        </div>
      ))}
    </div>
  )
}

export default function ListaCotizaciones() {
  const [cotizaciones, setCotizaciones] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [seleccionada, setSeleccionada] = useState(null)

  useEffect(() => {
    let activo = true
    async function cargar() {
      setCargando(true)
      setError(null)
      const { data, error } = await supabase
        .from('cotizaciones')
        .select('*')
        .order('fecha', { ascending: false })
        .order('creado_en', { ascending: false })

      if (!activo) return
      if (error) {
        setError(error.message)
      } else {
        setCotizaciones(data || [])
      }
      setCargando(false)
    }
    cargar()
    return () => {
      activo = false
    }
  }, [])

  // El detalle guardó un estado nuevo: refrescar la copia en memoria para
  // que la tarjeta de la lista (y el detalle si se reabre) lo muestren.
  function actualizarEstadoLocal(id, nuevoEstado) {
    setCotizaciones((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: nuevoEstado } : c)),
    )
    setSeleccionada((prev) =>
      prev && prev.id === id ? { ...prev, estado: nuevoEstado } : prev,
    )
  }

  if (seleccionada) {
    return (
      <DetalleCotizacion
        cotizacion={seleccionada}
        onVolver={() => setSeleccionada(null)}
        onEstadoActualizado={actualizarEstadoLocal}
      />
    )
  }

  return (
    <div className="lista">
      {cargando && <p>Cargando cotizaciones…</p>}

      {error && (
        <p className="mensaje-error" role="status">
          No se pudieron cargar las cotizaciones: {error}
        </p>
      )}

      {!cargando && !error && cotizaciones.length === 0 && (
        <p className="vacio">Todavía no hay cotizaciones guardadas.</p>
      )}

      {cotizaciones.map((c) => (
        <button
          type="button"
          className="cotizacion-card"
          key={c.id}
          onClick={() => setSeleccionada(c)}
        >
          <span className="cotizacion-card-cliente">{c.cliente || '—'}</span>
          <span className="cotizacion-card-linea">
            <span>{c.fecha || '—'}</span>
            <span>{c.numero || '—'}</span>
          </span>
          <span className="cotizacion-card-estado">{c.estado || '—'}</span>
        </button>
      ))}
    </div>
  )
}
