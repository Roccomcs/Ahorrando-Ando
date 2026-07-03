'use client'

import { useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FlatMaterial {
  color: string
  emissive?: string
  emissiveIntensity?: number
  metalness?: number
  roughness?: number
}

interface Props {
  url: string
  position: [number, number, number]
  floatSpeed: number
  floatAmplitude: number
  spinSpeed: number
  phase?: number
  /** Modelo texturizado: se preservan los materiales originales del glb, solo se ajusta metalness/roughness. */
  flatMaterial?: FlatMaterial
  metalBoost?: { metalness: number; roughness: number }
}

export function CoinModel({
  url,
  position,
  floatSpeed,
  floatAmplitude,
  spinSpeed,
  phase = 0,
  flatMaterial,
  metalBoost,
}: Props) {
  const { scene } = useGLTF(url)
  const group = useRef<THREE.Group>(null)

  const { content, scale } = useMemo(() => {
    if (flatMaterial) {
      let found: THREE.BufferGeometry | undefined
      scene.traverse(child => {
        if (!found && (child as THREE.Mesh).isMesh) {
          found = (child as THREE.Mesh).geometry
        }
      })
      if (!found) return { content: null, scale: 1 }
      const geo = (found as THREE.BufferGeometry).clone()
      geo.computeVertexNormals()
      geo.center()
      geo.computeBoundingSphere()
      const radius = geo.boundingSphere?.radius ?? 1
      return {
        content: (
          <mesh geometry={geo} castShadow receiveShadow>
            <meshStandardMaterial
              color={flatMaterial.color}
              emissive={flatMaterial.emissive ?? '#000000'}
              emissiveIntensity={flatMaterial.emissiveIntensity ?? 0}
              metalness={flatMaterial.metalness ?? 0.85}
              roughness={flatMaterial.roughness ?? 0.3}
            />
          </mesh>
        ),
        scale: radius > 0 ? 1.1 / radius : 1,
      }
    }

    const cloned = scene.clone(true)
    const box = new THREE.Box3().setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    cloned.traverse(child => {
      const mesh = child as THREE.Mesh
      if (mesh.isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
        const mat = mesh.material as THREE.MeshStandardMaterial | undefined
        if (mat && metalBoost) {
          mat.metalness = metalBoost.metalness
          mat.roughness = metalBoost.roughness
        }
      }
    })
    cloned.position.sub(center)
    const radius = sphere.radius || 1
    return { content: <primitive object={cloned} />, scale: radius > 0 ? 0.85 / radius : 1 }
  }, [scene, flatMaterial, metalBoost])

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.getElapsedTime()
    group.current.position.y = position[1] + Math.sin(t * floatSpeed + phase) * floatAmplitude
    // Oscila de frente en vez de girar 360° para que el logo quede legible.
    group.current.rotation.y = Math.sin(t * spinSpeed + phase) * THREE.MathUtils.degToRad(18)
  })

  if (!content) return null

  return (
    <group ref={group} position={position}>
      <group scale={scale}>{content}</group>
    </group>
  )
}
