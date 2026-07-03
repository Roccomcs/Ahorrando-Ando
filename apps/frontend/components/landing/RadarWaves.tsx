'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  /** Centro (posición de la moneda). */
  center: [number, number, number]
  color: string
  /** Segundos entre pulsos de una misma onda. */
  period?: number
  /** Cantidad de ondas simultáneas desfasadas. */
  count?: number
  /** Escala máxima que alcanza la onda antes de desvanecerse. */
  maxScale?: number
  /** Altura de las ondas respecto del centro de la moneda. */
  y?: number
  opacity?: number
}

/**
 * Ondas tipo radar: aros planos que se expanden y desvanecen en loop,
 * como pulsos de conexión. No giran — solo pulsan.
 */
export function RadarWaves({
  center,
  color,
  period = 2,
  count = 3,
  maxScale = 2.4,
  y = -0.75,
  opacity = 0.5,
}: Props) {
  const meshes = useRef<(THREE.Mesh | null)[]>([])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    for (let k = 0; k < count; k++) {
      const mesh = meshes.current[k]
      if (!mesh) continue
      const p = (t / period + k / count) % 1
      const s = 0.5 + p * (maxScale - 0.5)
      mesh.scale.setScalar(s)
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.opacity = (1 - p) * opacity
    }
  })

  return (
    <group position={[center[0], center[1] + y, center[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      {Array.from({ length: count }, (_, k) => (
        <mesh key={k} ref={el => { meshes.current[k] = el }}>
          <ringGeometry args={[0.94, 1, 64]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}
