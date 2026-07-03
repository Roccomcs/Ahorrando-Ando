'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  /** Centro del campo (posición de la moneda). */
  center: [number, number, number]
  colors: string[]
  count?: number
  /** Semieje mayor mínimo/máximo de las órbitas elípticas. */
  radiusMin?: number
  radiusMax?: number
  /** Achatamiento de la órbita en Z (0-1). */
  flatten?: number
  seed?: number
  size?: number
}

function seededRandom(seed: number) {
  let t = seed + 0x6d2b79f5
  return function next() {
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Campo gravitacional: partículas luminosas que describen órbitas elípticas
 * invisibles alrededor de la moneda, con una estela corta detrás de cada una.
 * No hay geometría visible — solo puntos y su rastro.
 */
export function GravityField({
  center,
  colors,
  count = 42,
  radiusMin = 1.5,
  radiusMax = 2.6,
  flatten = 0.32,
  seed = 1,
  size = 0.055,
}: Props) {
  const headGeo = useRef<THREE.BufferGeometry>(null)
  const tailGeo = useRef<THREE.BufferGeometry>(null)

  const { params, headPos, tailPos, colorArr } = useMemo(() => {
    const rand = seededRandom(seed * 104729 + count)
    const palette = colors.map(c => new THREE.Color(c))
    const p = new Array(count).fill(0).map(() => {
      const a = radiusMin + rand() * (radiusMax - radiusMin)
      return {
        a,
        b: a * (flatten + rand() * 0.12),
        speed: (0.12 + rand() * 0.22) * (rand() > 0.5 ? 1 : -1),
        phase: rand() * Math.PI * 2,
        y0: (rand() - 0.5) * 0.9,
        wobble: 0.04 + rand() * 0.08,
      }
    })
    const col = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const c = palette[Math.floor(rand() * palette.length)]
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    return {
      params: p,
      headPos: new Float32Array(count * 3),
      tailPos: new Float32Array(count * 3),
      colorArr: col,
    }
  }, [colors, count, radiusMin, radiusMax, flatten, seed])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    for (let i = 0; i < params.length; i++) {
      const q = params[i]
      const th = q.phase + t * q.speed
      headPos[i * 3] = Math.cos(th) * q.a
      headPos[i * 3 + 1] = q.y0 + Math.sin(th * 1.7) * q.wobble
      headPos[i * 3 + 2] = Math.sin(th) * q.b
      const tt = th - 0.16 * Math.sign(q.speed)
      tailPos[i * 3] = Math.cos(tt) * q.a
      tailPos[i * 3 + 1] = q.y0 + Math.sin(tt * 1.7) * q.wobble
      tailPos[i * 3 + 2] = Math.sin(tt) * q.b
    }
    if (headGeo.current) headGeo.current.getAttribute('position').needsUpdate = true
    if (tailGeo.current) tailGeo.current.getAttribute('position').needsUpdate = true
  })

  return (
    <group position={center}>
      <points>
        <bufferGeometry ref={headGeo}>
          <bufferAttribute attach="attributes-position" args={[headPos, 3]} />
          <bufferAttribute attach="attributes-color" args={[colorArr, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={size}
          vertexColors
          transparent
          opacity={0.95}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      {/* Estela: mismas órbitas, un paso atrás y más tenue */}
      <points>
        <bufferGeometry ref={tailGeo}>
          <bufferAttribute attach="attributes-position" args={[tailPos, 3]} />
          <bufferAttribute attach="attributes-color" args={[colorArr, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={size * 0.7}
          vertexColors
          transparent
          opacity={0.35}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}
