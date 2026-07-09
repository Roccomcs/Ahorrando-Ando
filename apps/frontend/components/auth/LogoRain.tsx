'use client'

import { Suspense, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
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
 * ────────────────────────────────────────────────────────────────────────── */
const MODELS = [
  { url: '/models/Bitcoin_Logo.glb', color: '#F7931A' },
  { url: '/models/Binance_Logo.glb', color: '#F0B90B' },
  { url: '/models/USDT_Logo.glb', color: '#26A17B' },
  { url: '/models/Aaple_Logo.glb', color: '#D8DBE0' },
  { url: '/models/Meli_Logo.glb', color: '#FFE600' },
] as const

MODELS.forEach(m => useGLTF.preload(m.url))

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

/** Un logo: se clona el .glb, se le calculan las normales, se lo pinta con el
 *  color de marca y se lo normaliza a `LOGO_RADIUS` centrado en su origen. */
function Logo({ url, color }: { url: string; color: string }) {
  const { scene } = useGLTF(url)

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

      // Estos .glb traen solo POSITION: sin NORMAL el material PBR no tiene
      // con qué sombrear y la malla sale negra. Las calculamos una vez.
      if (!mesh.geometry.getAttribute('normal')) mesh.geometry.computeVertexNormals()

      mesh.material = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.55,
        roughness: 0.3,
        emissive: new THREE.Color(color),
        // Un poco de emisión para que el logo no desaparezca en las zonas
        // que ninguna de las dos luces alcanza.
        emissiveIntensity: 0.18,
      })
    })

    const box = new THREE.Box3().setFromObject(cloned)
    cloned.position.sub(box.getCenter(new THREE.Vector3()))
    const radius = box.getBoundingSphere(new THREE.Sphere()).radius || 1
    return { object: cloned, scale: LOGO_RADIUS / radius }
  }, [scene, color])

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
          <Logo url={b.url} color={b.color} />
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
