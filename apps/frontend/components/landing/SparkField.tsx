'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  /** Centro del cluster (normalmente la posición de la moneda). */
  center: [number, number, number]
  /** Colores de la marca; se reparten entre las partículas. */
  colors: string[]
  count?: number
  /** Radio interno/externo del cascarón alrededor de la moneda. */
  innerRadius?: number
  outerRadius?: number
  seed?: number
  /** Velocidad de giro del cluster alrededor de la moneda (rad/s). */
  driftSpeed?: number
}

/** PRNG determinístico (mulberry32) para no depender de Math.random en render. */
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
 * Nube de chispas alrededor de una moneda, con los colores de su marca.
 * Dos capas de puntos (finos y gruesos) + parpadeo suave + deriva lenta.
 */
export function SparkField({
  center,
  colors,
  count = 26,
  innerRadius = 1.7,
  outerRadius = 2.9,
  seed = 1,
  driftSpeed = 0.04,
}: Props) {
  const group = useRef<THREE.Group>(null)
  const smallMat = useRef<THREE.PointsMaterial>(null)
  const bigMat = useRef<THREE.PointsMaterial>(null)

  const { small, big } = useMemo(() => {
    const rand = seededRandom(seed * 7919 + count)
    const palette = colors.map(c => new THREE.Color(c))
    const bigCount = Math.max(3, Math.round(count * 0.3))
    const smallCount = count - bigCount

    function build(n: number) {
      const pos = new Float32Array(n * 3)
      const col = new Float32Array(n * 3)
      for (let i = 0; i < n; i++) {
        // Cascarón achatado alrededor de la moneda (más ancho que alto)
        const angle = rand() * Math.PI * 2
        const r = innerRadius + rand() * (outerRadius - innerRadius)
        const y = (rand() - 0.5) * 1.6
        pos[i * 3] = Math.cos(angle) * r
        pos[i * 3 + 1] = y
        pos[i * 3 + 2] = Math.sin(angle) * r * 0.7
        const c = palette[Math.floor(rand() * palette.length)]
        col[i * 3] = c.r
        col[i * 3 + 1] = c.g
        col[i * 3 + 2] = c.b
      }
      return { pos, col }
    }

    return { small: build(smallCount), big: build(bigCount) }
  }, [colors, count, innerRadius, outerRadius, seed])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (group.current) group.current.rotation.y = t * driftSpeed
    // Parpadeo suave desfasado por capa
    if (smallMat.current) smallMat.current.opacity = 0.55 + 0.25 * Math.sin(t * 1.3 + seed)
    if (bigMat.current) bigMat.current.opacity = 0.75 + 0.25 * Math.sin(t * 0.9 + seed * 2)
  })

  return (
    <group position={center} ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[small.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[small.col, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={smallMat}
          size={0.045}
          vertexColors
          transparent
          opacity={0.7}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[big.pos, 3]} />
          <bufferAttribute attach="attributes-color" args={[big.col, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={bigMat}
          size={0.11}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </group>
  )
}
