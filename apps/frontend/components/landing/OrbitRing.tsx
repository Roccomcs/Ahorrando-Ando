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
}

export function OrbitRing({ position, radius, color, tilt = 0.4, speed, particleCount = 6 }: Props) {
  const ring = useRef<THREE.Group>(null)

  const ringGeometry = useMemo(() => new THREE.TorusGeometry(radius, 0.006, 8, 96), [radius])

  const particlePositions = useMemo(() => {
    const arr = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      arr[i * 3] = Math.cos(angle) * radius
      arr[i * 3 + 1] = 0
      arr[i * 3 + 2] = Math.sin(angle) * radius
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
        <mesh geometry={ringGeometry}>
          <meshBasicMaterial color={color} transparent opacity={0.22} />
        </mesh>
        <points>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[particlePositions, 3]} />
          </bufferGeometry>
          <pointsMaterial color={color} size={0.05} transparent opacity={0.85} sizeAttenuation />
        </points>
      </group>
    </group>
  )
}
