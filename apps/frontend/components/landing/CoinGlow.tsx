'use client'

import * as THREE from 'three'

interface Props {
  color: string
  radius?: number
  opacity?: number
}

export function CoinGlow({ color, radius = 1.3, opacity = 0.18 }: Props) {
  return (
    <mesh position={[0, 0, -0.4]}>
      <circleGeometry args={[radius, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}
