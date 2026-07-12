import * as THREE from 'three'

/* Los .glb de logos se exportaron solo con POSITION: sin materiales, sin UVs,
 * sin normales y sin vertex colors. Además el símbolo (la "B" de Bitcoin, la
 * "T" de Tether) no es geometría separable del disco, así que no hay forma de
 * pintarlo aparte mirando los vértices.
 *
 * La salida: proyectar la imagen real del logo sobre las dos caras de la
 * moneda. Para eso hace falta (1) saber hacia dónde miran esas caras y
 * (2) generarle UVs al modelo. Es lo que hace este módulo. */

/** Eje normal de las caras planas de la moneda.
 *
 * Se acumula el tensor de covarianza de las normales de cara, pesado por área:
 * las dos caras grandes aportan casi toda el área con normales ±n, así que el
 * autovector dominante del tensor es exactamente n. Se resuelve con iteración
 * de potencia (matriz 3×3, converge en unas pocas vueltas).
 *
 * Hace falta calcularlo porque cada modelo vino rotado distinto: las monedas
 * están giradas 45° sobre Y. */
export function faceAxis(geo: THREE.BufferGeometry): THREE.Vector3 {
  const pos = geo.getAttribute('position')
  const index = geo.getIndex()
  const triCount = index ? index.count / 3 : pos.count / 3

  const m = new Float64Array(9)
  let totalArea = 0

  const a = new THREE.Vector3()
  const b = new THREE.Vector3()
  const c = new THREE.Vector3()
  const ab = new THREE.Vector3()
  const ac = new THREE.Vector3()
  const n = new THREE.Vector3()

  for (let t = 0; t < triCount; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2

    a.fromBufferAttribute(pos, i0)
    b.fromBufferAttribute(pos, i1)
    c.fromBufferAttribute(pos, i2)
    ab.subVectors(b, a)
    ac.subVectors(c, a)
    n.crossVectors(ab, ac)

    // |n| es el doble del área del triángulo: sirve directo como peso.
    const area = n.length()
    if (area === 0) continue
    n.divideScalar(area)
    totalArea += area

    const u = [n.x, n.y, n.z]
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i * 3 + j] += area * u[i] * u[j]
  }
  if (totalArea === 0) return new THREE.Vector3(0, 0, 1)
  for (let i = 0; i < 9; i++) m[i] /= totalArea

  // Iteración de potencia. El vector inicial es deliberadamente "torcido" para
  // no caer justo en un autovector no dominante.
  const v = new THREE.Vector3(1, 0.3, 0.7).normalize()
  const r = new THREE.Vector3()
  for (let it = 0; it < 64; it++) {
    r.set(
      m[0] * v.x + m[1] * v.y + m[2] * v.z,
      m[3] * v.x + m[4] * v.y + m[5] * v.z,
      m[6] * v.x + m[7] * v.y + m[8] * v.z
    )
    if (r.lengthSq() === 0) break
    v.copy(r).normalize()
  }
  // La iteración de potencia converge a +n o −n de forma arbitraria (el signo del
  // autovector no está definido). Ese signo decide qué cara recibe el UV directo
  // y cuál el espejado, así que sin fijarlo el logo salía bien o espejado según
  // el build. Lo fijamos hacia +Z: en reposo las monedas miran a la cámara (que
  // está en +Z), de modo que la cara que se ve primero es siempre la "de frente".
  if (v.z < 0) v.negate()
  return v
}

/** Genera UVs proyectando la geometría sobre el plano perpendicular a `axis`.
 *
 * El bounding box de la proyección se estira a [0,1]², de modo que la
 * silueta del modelo queda calzada con el arte de la imagen. El canto samplea
 * los bordes de la textura.
 *
 * La cara de atrás se ve desde el otro lado: si compartiera el UV con la de
 * adelante, el logo saldría espejado ahí (la "B" de Bitcoin al revés cuando la
 * moneda gira). Por eso a los vértices de la cara trasera se les espeja la U,
 * de modo que el logo se lee bien en AMBAS caras.
 *
 * Muta la geometría (la comparten todas las instancias del mismo .glb) y se
 * marca en `userData` para no recalcular.
 */
export function applyPlanarUV(geo: THREE.BufferGeometry, axis: THREE.Vector3): void {
  if (geo.userData.logoUV) return

  // Base ortonormal del plano de la cara.
  const u = new THREE.Vector3(0, 1, 0)
  if (Math.abs(axis.dot(u)) > 0.9) u.set(1, 0, 0)
  u.crossVectors(u, axis).normalize()
  const v = new THREE.Vector3().crossVectors(axis, u).normalize()

  const pos = geo.getAttribute('position')
  const su = new Float32Array(pos.count)
  const sv = new Float32Array(pos.count)
  const sa = new Float32Array(pos.count) // proyección sobre el eje (para separar caras)
  const p = new THREE.Vector3()
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity
  let minA = Infinity, maxA = -Infinity

  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    const pu = p.dot(u)
    const pv = p.dot(v)
    const pa = p.dot(axis)
    su[i] = pu
    sv[i] = pv
    sa[i] = pa
    if (pu < minU) minU = pu
    if (pu > maxU) maxU = pu
    if (pv < minV) minV = pv
    if (pv > maxV) maxV = pv
    if (pa < minA) minA = pa
    if (pa > maxA) maxA = pa
  }

  const spanU = maxU - minU || 1
  const spanV = maxV - minV || 1
  const midA = (minA + maxA) / 2
  const uv = new Float32Array(pos.count * 2)
  for (let i = 0; i < pos.count; i++) {
    const nu = (su[i] - minU) / spanU
    // Ahora `axis` apunta a +Z (hacia cámara), así que la cara del lado del eje
    // (sa ≥ midA) es la de frente. Con la base v = axis × u, su screen-right cae
    // sobre +u, de modo que el UV directo (nu) la deja sin espejar. La cara de
    // atrás, que se ve desde el otro lado al girar, lleva la U espejada (1−nu)
    // para leerse igual de bien. Así la "B" de Bitcoin queda derecha en ambas.
    uv[i * 2] = sa[i] < midA ? 1 - nu : nu
    // V invertida: el origen de la textura está arriba (y por eso el material
    // desactiva `flipY`, que si no la invertiría de nuevo).
    uv[i * 2 + 1] = 1 - (sv[i] - minV) / spanV
  }

  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  geo.userData.logoUV = true
}

const _texCache = new Map<string, Promise<THREE.Texture>>()

const TEX_SIZE = 512

/** Reescribe el `width`/`height` del SVG a `TEX_SIZE` y lo devuelve como blob URL.
 *
 * Sin esto, un SVG con tamaño intrínseco chico (btc.svg mide 32×32) se rasteriza
 * a 32px y recién ahí se escala al canvas: sale todo borroso. Forzando el tamaño
 * del root, el navegador rasteriza el vector directo a 512px. */
async function svgAt512(src: string): Promise<string> {
  const svg = await fetch(src).then(r => r.text())
  const sized = svg.replace(
    /<svg\b[^>]*>/,
    tag => tag
      .replace(/\swidth="[^"]*"/, '')
      .replace(/\sheight="[^"]*"/, '')
      .replace(/<svg/, `<svg width="${TEX_SIZE}" height="${TEX_SIZE}"`)
  )
  return URL.createObjectURL(new Blob([sized], { type: 'image/svg+xml' }))
}

/** Rasteriza el SVG del logo sobre un fondo del color de marca.
 *
 * El fondo importa: los SVG traen las esquinas transparentes, y sin relleno el
 * canto de la moneda (que samplea esas esquinas) saldría negro. */
export function loadLogoTexture(src: string, brandColor: string): Promise<THREE.Texture> {
  const key = `${src}|${brandColor}`
  const hit = _texCache.get(key)
  if (hit) return hit

  const promise = svgAt512(src).then(
    url =>
      new Promise<THREE.Texture>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          URL.revokeObjectURL(url)
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = TEX_SIZE
          const ctx = canvas.getContext('2d')!
          ctx.fillStyle = brandColor
          ctx.fillRect(0, 0, TEX_SIZE, TEX_SIZE)
          ctx.drawImage(img, 0, 0, TEX_SIZE, TEX_SIZE)

          const tex = new THREE.CanvasTexture(canvas)
          tex.colorSpace = THREE.SRGBColorSpace
          tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
          // `applyPlanarUV` ya emite la V con el origen arriba, como la imagen.
          // Sin esto, el flipY por defecto la invertiría una segunda vez y los
          // logos saldrían cabeza abajo (era el caso de la T de Tether).
          tex.flipY = false
          tex.anisotropy = 4
          tex.needsUpdate = true
          resolve(tex)
        }
        img.onerror = () => {
          URL.revokeObjectURL(url)
          reject(new Error(`No se pudo cargar el logo ${src}`))
        }
        img.src = url
      })
  )

  _texCache.set(key, promise)
  return promise
}
