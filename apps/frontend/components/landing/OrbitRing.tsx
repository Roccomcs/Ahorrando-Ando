'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  position: [number, number, number]
  radius: number
  color: string
  tilt?: number
  speed: number
  particleCount?: number
  /** Grosor del tubo del anillo. */
  thickness?: number
}

export function OrbitRing({
  position,
  radius,
  color,
  tilt = 0.4,
  speed,
  particleCount = 6,
  thickness = 0.05,
}: Props) {
  const ring = useRef<THREE.Group>(null)

  const ringGeometry = useMemo(
    () => new THREE.TorusGeometry(radius, thickness, 24, 128),
    [radius, thickness],
  )

  const particlePositions = useMemo(() => {
    const arr = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      arr[i * 3] = Math.cos(angle) * radius
      arr[i * 3 + 1] = Math.sin(angle) * radius
      arr[i * 3 + 2] = 0
    }
    return arr
  }, [particleCount, radius])

  useFrame(({ clock }) => {
    if (!ring.current) return
    ring.current.rotation.z = clock.getElapsedTime() * speed
  })

  return (
    <group position={position} rotation={[tilt, 0, 0]}>
      <group ref={ring}>
        {/* Anillo sólido metálico: las luces de la escena le dan volumen 3D */}
        <mesh geometry={ringGeometry}>
          <meshStandardMaterial
            color={color}
            metalness={0.9}
            roughness={0.25}
            emissive={color}
            emissiveIntensity={0.35}
          />
        </mesh>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
          </bufferGeometry>
          <pointsMaterial
            color={color}
            size={0.09}
            transparent
            opacity={0.9}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      </group>
    </group>
  )
}
