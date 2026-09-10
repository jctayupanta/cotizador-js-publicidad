import { useState } from 'react'
import FormularioCotizacion from './FormularioCotizacion'
import ListaCotizaciones from './ListaCotizaciones'
import './App.css'

function App() {
  const [vista, setVista] = useState('nueva') // 'nueva' | 'anteriores'

  return (
    <main>
      <h1>Cotizador JS Publicidad</h1>

      <nav className="nav">
        <button
          type="button"
          className={vista === 'nueva' ? 'nav-activo' : ''}
          onClick={() => setVista('nueva')}
        >
          Nueva cotización
        </button>
        <button
          type="button"
          className={vista === 'anteriores' ? 'nav-activo' : ''}
          onClick={() => setVista('anteriores')}
        >
          Ver anteriores
        </button>
      </nav>

      {vista === 'nueva' ? <FormularioCotizacion /> : <ListaCotizaciones />}
    </main>
  )
}

export default App
