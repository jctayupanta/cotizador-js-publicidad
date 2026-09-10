import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from '@react-pdf/renderer'

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
  th: {
    color: AZUL,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    padding: 4,
  },
  td: {
    padding: 4,
    fontSize: 8,
  },
  cellBorder: {
    borderRightWidth: 1,
    borderColor: AZUL,
  },
  subLinea: {
    fontSize: 7,
    color: '#444',
    marginTop: 2,
  },
  subEtiqueta: {
    fontFamily: 'Helvetica-Bold',
  },

  colItem: { width: 34, textAlign: 'center' },
  colCant: { width: 34, textAlign: 'center' },
  colDesc: { width: 179 },
  colImg: { width: 104 },
  colVU: { width: 88, textAlign: 'right' },
  colTotal: { width: 88, textAlign: 'right' },

  imgCell: {
    alignItems: 'center',
    justifyContent: 'center',
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
              <Text style={[styles.th, styles.colItem, styles.cellBorder]}>
                Ítems
              </Text>
              <Text style={[styles.th, styles.colCant, styles.cellBorder]}>
                Cant.
              </Text>
              <Text style={[styles.th, styles.colDesc, styles.cellBorder]}>
                Descripción
              </Text>
              <Text style={[styles.th, styles.colImg, styles.cellBorder]}>
                Imagen de Referencia
              </Text>
              <Text style={[styles.th, styles.colVU, styles.cellBorder]}>
                Valor Unitario
              </Text>
              <Text style={[styles.th, styles.colTotal]}>Total</Text>
            </View>

            {productos.map((p, i) => (
              <View style={styles.tableRow} key={i} wrap={false}>
                <Text style={[styles.td, styles.colItem, styles.cellBorder]}>
                  {i + 1}
                </Text>
                <Text style={[styles.td, styles.colCant, styles.cellBorder]}>
                  {p.cantidad}
                </Text>
                <View style={[styles.td, styles.colDesc, styles.cellBorder]}>
                  <Text>{p.descripcion}</Text>
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
                    styles.td,
                    styles.colImg,
                    styles.cellBorder,
                    styles.imgCell,
                  ]}
                >
                  {p.foto ? (
                    <Image src={p.foto} style={styles.fotoRef} />
                  ) : null}
                </View>
                <Text style={[styles.td, styles.colVU, styles.cellBorder]}>
                  {p.valorUnitario}
                </Text>
                <Text style={[styles.td, styles.colTotal]}>{p.total}</Text>
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
