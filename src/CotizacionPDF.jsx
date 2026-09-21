import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'
import { parseNumero } from './numeros'

// Las imágenes viven en /public y se referencian por URL, NO se importan.
// Así el bundler no las mete en el grafo de módulos JS (evita el error
// "Expected a JavaScript module but got image/…").
// BASE_URL es "/" en local y "/nombre-repo/" en GitHub Pages, para que la
// URL siga siendo correcta cuando el sitio se sirve en una subcarpeta.
const headerImg = `${import.meta.env.BASE_URL}js-publicidad-header.png`
const footerImg = `${import.meta.env.BASE_URL}js-publicidad-footer.png`

const AZUL = '#16294d'
const CELESTE = '#cfe3f7'

const NUMERO_COTIZACION_POR_DEFECTO = 'JS-232396'

// A4 en puntos y proporción real de cada imagen (para no deformarlas)
const PAGE_WIDTH = 595.28
const HEADER_W = 910
const HEADER_H = 232
const FOOTER_W = 908
const FOOTER_H = 190
const HEADER_HEIGHT = (PAGE_WIDTH * HEADER_H) / HEADER_W
const FOOTER_HEIGHT = (PAGE_WIDTH * FOOTER_H) / FOOTER_W

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#222',
    paddingBottom: FOOTER_HEIGHT + 16,
  },

  headerImg: {
    width: PAGE_WIDTH,
    height: HEADER_HEIGHT,
  },

  body: {
    paddingHorizontal: 34,
    paddingTop: 8,
  },

  titulo: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 15,
    color: AZUL,
    marginBottom: 12,
  },

  infoLine: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  infoLabel: {
    fontFamily: 'Helvetica-Bold',
  },

  table: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: AZUL,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: CELESTE,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: AZUL,
  },
  // Estilo del TEXTO de encabezado / contenido (centrado horizontal).
  th: {
    color: AZUL,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textAlign: 'center',
  },
  td: {
    fontSize: 8,
    textAlign: 'center',
  },
  // Caja de cada celda: el contenido queda centrado verticalmente.
  celda: {
    padding: 4,
    justifyContent: 'center',
  },
  cellBorder: {
    borderRightWidth: 1,
    borderColor: AZUL,
  },
  subLinea: {
    fontSize: 7,
    color: '#444',
    marginTop: 2,
    textAlign: 'center',
  },
  subEtiqueta: {
    fontFamily: 'Helvetica-Bold',
  },

  colItem: { width: 34 },
  colCant: { width: 34 },
  colDesc: { width: 179 },
  colImg: { width: 104 },
  colVU: { width: 88 },
  colTotal: { width: 88 },

  imgCell: {
    alignItems: 'center',
  },
  fotoRef: {
    width: 92,
    height: 54,
    objectFit: 'contain',
  },

  condiciones: {
    marginTop: 16,
  },
  condLine: {
    marginBottom: 2,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  footerImg: {
    width: PAGE_WIDTH,
    height: FOOTER_HEIGHT,
  },
})

function fechaDeHoy() {
  const d = new Date()
  const dia = String(d.getDate()).padStart(2, '0')
  const mes = String(d.getMonth() + 1).padStart(2, '0')
  return `${dia}/${mes}/${d.getFullYear()}`
}

// Formatea un importe con "$" y siempre 2 decimales ("45.5" -> "$45.50",
// "1250" -> "$1250.00"). Acepta coma o punto como separador decimal. Si está
// vacío o no es un número, no muestra nada (un "$" solo se vería mal).
function conDolar(valor) {
  const n = parseNumero(valor)
  if (n === null) return ''
  return `$${n.toFixed(2)}`
}

// Celda de tabla con un solo texto, centrado horizontal y verticalmente.
function Celda({ col, encabezado = false, sinBorde = false, children }) {
  return (
    <View style={[styles.celda, col, !sinBorde && styles.cellBorder]}>
      <Text style={encabezado ? styles.th : styles.td}>{children}</Text>
    </View>
  )
}

function InfoLine({ label, valor }) {
  return (
    <View style={styles.infoLine}>
      <Text style={styles.infoLabel}>{label}: </Text>
      <Text>{valor || '-'}</Text>
    </View>
  )
}

export default function CotizacionPDF({
  numero = NUMERO_COTIZACION_POR_DEFECTO,
  cliente,
  contacto,
  detalleGeneral,
  productos,
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Image src={headerImg} style={styles.headerImg} />

        <View style={styles.body}>
          <Text style={styles.titulo}>Cotización #{numero}</Text>

          <InfoLine label="Cliente" valor={cliente} />
          <InfoLine label="Contacto" valor={contacto} />
          <InfoLine label="Fecha" valor={fechaDeHoy()} />
          <InfoLine label="Detalle" valor={detalleGeneral} />

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Celda encabezado col={styles.colItem}>
                Ítems
              </Celda>
              <Celda encabezado col={styles.colCant}>
                Cant.
              </Celda>
              <Celda encabezado col={styles.colDesc}>
                Descripción
              </Celda>
              <Celda encabezado col={styles.colImg}>
                Imagen de Referencia
              </Celda>
              <Celda encabezado col={styles.colVU}>
                Valor Unitario
              </Celda>
              <Celda encabezado sinBorde col={styles.colTotal}>
                Total
              </Celda>
            </View>

            {productos.map((p, i) => (
              <View style={styles.tableRow} key={i} wrap={false}>
                <Celda col={styles.colItem}>{i + 1}</Celda>
                <Celda col={styles.colCant}>{p.cantidad}</Celda>
                <View
                  style={[styles.celda, styles.colDesc, styles.cellBorder]}
                >
                  <Text style={styles.td}>{p.descripcion}</Text>
                  {p.material ? (
                    <Text style={styles.subLinea}>
                      <Text style={styles.subEtiqueta}>Material:</Text>{' '}
                      {p.material}
                    </Text>
                  ) : null}
                  {p.incluye ? (
                    <Text style={styles.subLinea}>
                      <Text style={styles.subEtiqueta}>Incluye:</Text>{' '}
                      {p.incluye}
                    </Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.celda,
                    styles.colImg,
                    styles.cellBorder,
                    styles.imgCell,
                  ]}
                >
                  {p.foto ? (
                    <Image src={p.foto} style={styles.fotoRef} />
                  ) : null}
                </View>
                <Celda col={styles.colVU}>{conDolar(p.valorUnitario)}</Celda>
                <Celda sinBorde col={styles.colTotal}>
                  {conDolar(p.total)}
                </Celda>
              </View>
            ))}
          </View>

          <View style={styles.condiciones}>
            <Text style={styles.condLine}>
              Condiciones: Validez de la oferta 15 días, los precios no incluyen
              IVA.
            </Text>
            <Text style={styles.condLine}>Moneda: dólar</Text>
            <Text style={styles.condLine}>
              Tiempo de entrega: En coordinación con el cliente.
            </Text>
            <Text style={styles.condLine}>Elaborado por: Jaime Pozo</Text>
            <Text style={styles.condLine}>
              Contacto Comercial: Jeanneth Guerra
            </Text>
            <Text style={styles.condLine}>
              Email: jspublicidadec@gmail.com / guerrajeanneth@gmail.com
            </Text>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Image src={footerImg} style={styles.footerImg} />
        </View>
      </Page>
    </Document>
  )
}
