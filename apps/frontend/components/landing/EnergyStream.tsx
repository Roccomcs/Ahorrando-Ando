'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  from: [number, number, number]
  to: [number, number, number]
  color: string
  count?: number
  /** Velocidad de recorrido (ciclos por segundo). */
  speed?: number
  seed?: number
}

/**
 * Energía que fluye de una moneda a la siguiente: partículas pequeñas que
 * descienden por una trayectoria invisible con un leve serpenteo.
 */
export function EnergyStream({ from, to, color, count = 9, speed = 0.16, seed = 1 }: Props) {
  const geo = useRef<THREE.BufferGeometry>(null)

  const { positions, phases } = useMemo(() => {
    const ph = new Float32Array(count)
    for (let i = 0; i < count; i++) ph[i] = (i / count + (seed * 0.37) % 1) % 1
    return { positions: new Float32Array(count * 3), phases: ph }
  }, [count, seed])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    for (let i = 0; i < count; i++) {
      const p = (phases[i] + t * speed) % 1
      positions[i * 3] = from[0] + (to[0] - from[0]) * p + Math.sin(p * 9 + seed * 3) * 0.07
      positions[i * 3 + 1] = from[1] + (to[1] - from[1]) * p
      positions[i * 3 + 2] = from[2] + (to[2] - from[2]) * p
    }
    if (geo.current) geo.current.getAttribute('position').needsUpdate = true
  })

  return (
    <points>
      <bufferGeometry ref={geo}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={0.045}
        transparent
        opacity={0.55}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
