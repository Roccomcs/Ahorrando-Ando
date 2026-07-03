'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  count?: number
  spread?: [number, number, number]
  colors?: string[]
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

export function SparkField({ count = 50, spread = [4, 7, 3], colors = ['#f7c268', '#ffffff', '#41A4EF'] }: Props) {
  const points = useRef<THREE.Points>(null)

  const { positions, particleColors } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const palette = colors.map(c => new THREE.Color(c))
    const rand = seededRandom(count * 7919)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * spread[0] * 2
      pos[i * 3 + 1] = (rand() - 0.5) * spread[1] * 2
      pos[i * 3 + 2] = (rand() - 0.5) * spread[2] * 2
      const c = palette[i % palette.length]
      col[i * 3] = c.r
      col[i * 3 + 1] = c.g
      col[i * 3 + 2] = c.b
    }
    return { positions: pos, particleColors: col }
  }, [count, spread, colors])

  useFrame(({ clock }) => {
    if (!points.current) return
    points.current.rotation.y = clock.getElapsedTime() * 0.02
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[particleColors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        vertexColors
        transparent
        opacity={0.75}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
