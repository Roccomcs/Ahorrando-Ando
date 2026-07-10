'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { faceAxis, applyPlanarUV, loadLogoTexture } from '@/components/three/logoProjection'
import s from './LogoRain.module.css'

/* ─────────────────────────────────────────────────────────────────────────────
 * MAPEO DE MODELOS
 * Cada .glb vive en `apps/frontend/public/models/` y se referencia desde la raíz
 * pública (`/models/...`). Para sumar un logo nuevo:
 *   1. Copiá el .glb a `public/models/`.
 *   2. Agregá `{ url, color }` acá abajo.
 * El resto (escala, física, reciclado) se resuelve solo: cada modelo se
 * normaliza a `LOGO_RADIUS` sin importar el tamaño con el que fue exportado.
 *
 * `color` es obligatorio: estos .glb se exportaron solo con POSITION —
 * sin materiales, sin normales y sin vertex colors. Ver `Logo` más abajo.
 *
 * `logo` es opcional: si se indica, la imagen se proyecta sobre las dos caras
 * de la moneda y `color` pasa a ser solo el color del canto y del fondo de la
 * textura. Sin `logo`, el modelo queda del color plano de la marca — que es lo
 * correcto cuando el .glb ya tiene la forma del logo (Apple, Meta).
 * ────────────────────────────────────────────────────────────────────────── */
const MODELS = [
  { url: '/models/Bitcoin_Logo.glb', color: '#F7931A', logo: '/crypto/btc.svg' },
  { url: '/models/Binance_Logo.glb', color: '#F0B90B', logo: '/models/binance-face.svg' },
  { url: '/models/USDT_Logo.glb', color: '#26A17B', logo: '/crypto/usdt.svg' },
  // Apple y Meta van en color sólido a propósito: el .glb ya tiene la silueta
  // del logo, así que no hay nada que proyectarle encima.
  { url: '/models/Aaple_Logo.glb', color: '#D8DBE0', logo: null },
  { url: '/models/Meta_Logo.glb', color: '#0082FB', logo: null },
] as const

MODELS.forEach(m => useGLTF.preload(m.url))

/** Rasteriza el logo a textura una sola vez y la comparte entre instancias. */
function useLogoTexture(src: string | null, brandColor: string): THREE.Texture | null {
  const [tex, setTex] = useState<THREE.Texture | null>(null)
  useEffect(() => {
    if (!src) return
    let alive = true
    loadLogoTexture(src, brandColor).then(t => { if (alive) setTex(t) }).catch(() => {})
    return () => { alive = false }
  }, [src, brandColor])
  return tex
}

/** Radio de cada logo en unidades de mundo (todos quedan del mismo tamaño). */
const LOGO_RADIUS = 0.42
/** Gravedad. Más alto = rebotes más rápidos y secos. */
const GRAVITY = 11
/** Cuánta energía conserva cada rebote (0 = muere al tocar, 1 = rebota infinito). */
const RESTITUTION = 0.76
/** Velocidad hacia la izquierda, en unidades de mundo por segundo. */
const DRIFT_SPEED = 0.95
/** Cuando el rebote se apaga por debajo de esto, se le devuelve impulso. */
const MIN_BOUNCE_VY = 2.4
const KICK_VY = 5.4
/** Margen fuera de cámara para nacer/morir sin que se vea el pop. */
const OFFSCREEN = 1.2

interface Body {
  url: string
  color: string
  logo: string | null
  /** Posición X actual (empieza fuera de pantalla por derecha). */
  x: number
  /** Altura sobre el suelo invisible. */
  y: number
  /** Velocidad vertical. */
  vy: number
  z: number
  spinX: number
  spinY: number
  /** Segundos que faltan para que entre en escena (ritmo escalonado). */
  delay: number
}

/** Un logo: se clona el .glb, se le calculan normales y UVs, se le proyecta la
 *  imagen de marca y se lo normaliza a `LOGO_RADIUS` centrado en su origen. */
function Logo({ url, color, logo }: { url: string; color: string; logo: string | null }) {
  const { scene } = useGLTF(url)
  const tex = useLogoTexture(logo, color)

  const { object, scale } = useMemo(() => {
    // Clon profundo: el mismo .glb se instancia varias veces y cada copia
    // necesita su propia matriz. Se conserva el nodo raíz porque gltfpack
    // guarda ahí la des-cuantización de las posiciones.
    const cloned = scene.clone(true)

    cloned.traverse(child => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = false
      mesh.receiveShadow = false

      const geo = mesh.geometry
      // Estos .glb traen solo POSITION: sin NORMAL el material PBR no tiene
      // con qué sombrear y la malla sale negra. Las calculamos una vez.
      if (!geo.getAttribute('normal')) geo.computeVertexNormals()
      // Y sin UV no hay dónde pegar la imagen del logo. `applyPlanarUV` cachea
      // en la geometría, que es compartida por todas las instancias del .glb.
      if (logo && !geo.getAttribute('uv')) applyPlanarUV(geo, faceAxis(geo))

      mesh.material = new THREE.MeshStandardMaterial({
        // Con textura el color base va en blanco para no teñir la imagen.
        color: tex ? '#ffffff' : color,
        map: tex,
        metalness: 0.35,
        roughness: 0.42,
        emissive: new THREE.Color(color),
        // Un poco de emisión para que el logo no desaparezca en las zonas
        // que ninguna de las dos luces alcanza.
        emissiveIntensity: tex ? 0.06 : 0.18,
      })
    })

    const box = new THREE.Box3().setFromObject(cloned)
    cloned.position.sub(box.getCenter(new THREE.Vector3()))
    const radius = box.getBoundingSphere(new THREE.Sphere()).radius || 1
    return { object: cloned, scale: LOGO_RADIUS / radius }
  }, [scene, color, logo, tex])

  return (
    <group scale={scale}>
      <primitive object={object} />
    </group>
  )
}

/** Simulación: integración balística explícita + rebote sobre un suelo invisible.
 *  Es mucho más barata que un motor de físicas (no hay colisiones entre cuerpos,
 *  solo cuerpo-vs-plano) y da exactamente el rebote amortiguado que buscamos. */
function Rain() {
  const { viewport } = useThree()
  const groups = useRef<(THREE.Group | null)[]>([])

  const bodies = useMemo<Body[]>(
    () =>
      MODELS.map((m, i) => ({
        url: m.url,
        color: m.color,
        logo: m.logo,
        // NaN = "todavía no nació": el primer frame lo posiciona fuera de
        // cámara, ya conociendo el viewport real (que depende del tamaño).
        x: NaN,
        y: 0,
        vy: 0,
        // Cada logo en su propio plano Z: da profundidad y evita solapes planos.
        z: -0.9 + (i % 4) * 0.6,
        spinX: 0.25 + (i % 3) * 0.12,
        spinY: 0.4 + (i % 2) * 0.22,
        // Ritmo escalonado: entran uno tras otro, no todos juntos.
        delay: i * 2.6,
      })),
    []
  )

  useFrame((_, rawDelta) => {
    // Cap del delta: si la pestaña estuvo en background, un dt enorme haría que
    // los cuerpos atraviesen el suelo de un salto.
    const dt = Math.min(rawDelta, 1 / 30)

    const halfW = viewport.width / 2
    const spawnX = halfW + OFFSCREEN
    const despawnX = -halfW - OFFSCREEN
    // Suelo invisible cerca del borde inferior: los rebotes pasan por detrás
    // (y por debajo) de la tarjeta de login.
    const floorY = -viewport.height / 2 + LOGO_RADIUS * 0.6

    bodies.forEach((b, i) => {
      const g = groups.current[i]
      if (!g) return

      if (b.delay > 0) {
        b.delay -= dt
        g.visible = false
        return
      }
      g.visible = true

      if (!Number.isFinite(b.x)) {
        b.x = spawnX
        b.y = viewport.height / 2 + OFFSCREEN
        b.vy = 0
      }

      b.x -= DRIFT_SPEED * dt
      b.vy -= GRAVITY * dt
      b.y += b.vy * dt

      if (b.y <= floorY) {
        b.y = floorY
        b.vy = -b.vy * RESTITUTION
        // Sin esto la amortiguación termina dejándolo rodando sobre el suelo.
        if (b.vy < MIN_BOUNCE_VY) b.vy = KICK_VY
      }

      // Reciclado: al salir por la izquierda vuelve a nacer por la derecha.
      // El pool es fijo (un cuerpo por modelo), así que no se crea ni se
      // destruye nada en runtime — cero presión sobre el GC.
      if (b.x < despawnX) {
        b.x = spawnX
        b.y = viewport.height / 2 + OFFSCREEN
        b.vy = 0
      }

      g.position.set(b.x, b.y, b.z)
      g.rotation.x += b.spinX * dt
      g.rotation.y += b.spinY * dt
    })
  })

  return (
    <>
      {bodies.map((b, i) => (
        <group
          key={b.url}
          ref={el => {
            groups.current[i] = el
          }}
          visible={false}
        >
          <Logo url={b.url} color={b.color} logo={b.logo} />
        </group>
      ))}
    </>
  )
}

export function LogoRain() {
  return (
    <div className={s.canvas} aria-hidden="true">
      <Canvas
        gl={{ alpha: true, antialias: true, powerPreference: 'low-power' }}
        // Cap de DPR: en móviles con DPR 3 el fill-rate se dispara sin ganancia visible.
        dpr={[1, 1.6]}
        camera={{ fov: 45, position: [0, 0, 8] }}
        style={{ background: 'transparent' }}
      >
        {/* Iluminación básica: ambiente para que ninguna cara quede negra +
            una direccional cálida de key y una fría de relleno para el volumen. */}
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 6, 5]} intensity={2.2} color="#ffffff" />
        <directionalLight position={[-5, -2, -3]} intensity={0.8} color="#5b9bd5" />

        {/* Suspense: los .glb pesan; la tarjeta de login no espera al 3D. */}
        <Suspense fallback={null}>
          <Rain />
        </Suspense>
      </Canvas>
    </div>
  )
}
