'use client'

// Página de depuración para orientar la "B" de Bitcoin en 3D.
// Moná una moneda quieta mirando a cámara y un slider que rota el logo en vivo.
// Ajustá hasta que la B quede derecha y pasame el ángulo (y flips). No linkeada;
// se borra cuando fijemos la orientación.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { faceAxis, applyPlanarUV, loadLogoTexture } from '@/components/three/logoProjection'

const URL_GLB = '/models/Bitcoin_Logo.glb'
const LOGO = '/crypto/btc.svg'
const BASE = '#F7931A'

function DebugCoin({ rot, flipU, flipV }: { rot: number; flipU: boolean; flipV: boolean }) {
  const { scene } = useGLTF(URL_GLB)
  const [tex, setTex] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    let alive = true
    loadLogoTexture(LOGO, BASE).then(t => { if (alive) setTex(t) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const { object, scale } = useMemo(() => {
    const cloned = scene.clone(true)
    cloned.traverse(child => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      const geo = mesh.geometry as THREE.BufferGeometry
      if (!geo.getAttribute('normal')) geo.computeVertexNormals()
      // force:true → recalcula el UV en cada cambio de slider.
      applyPlanarUV(geo, faceAxis(geo), { rotationDeg: rot, flipU, flipV, force: true })
      mesh.material = new THREE.MeshStandardMaterial({
        color: '#ffffff', map: tex, metalness: 0.6, roughness: 0.28,
        emissive: new THREE.Color(BASE), emissiveIntensity: 0.08,
      })
    })
    const box = new THREE.Box3().setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    cloned.position.sub(center)
    return { object: cloned, scale: 1.9 / (sphere.radius || 1) }
  }, [scene, tex, rot, flipU, flipV])

  return <group scale={scale}><primitive object={object} /></group>
}

export default function CoinTest() {
  const [rot, setRot] = useState(0)
  const [flipU, setFlipU] = useState(false)
  const [flipV, setFlipV] = useState(false)
  const [spin, setSpin] = useState(false)

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a', position: 'relative' }}>
      <Canvas gl={{ preserveDrawingBuffer: true }} camera={{ fov: 40, position: [0, 0, 6] }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 6, 5]} intensity={2} color="#ffdca6" />
        <directionalLight position={[-4, -2, -3]} intensity={0.6} color="#2f6bb0" />
        <Environment preset="city" />
        <SpinWrap spin={spin}>
          <DebugCoin rot={rot} flipU={flipU} flipV={flipV} />
        </SpinWrap>
      </Canvas>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 16, background: 'rgba(0,0,0,0.65)', color: '#fff', fontFamily: 'monospace', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>
          Rotación: {rot}°  ·  flipU={String(flipU)}  ·  flipV={String(flipV)}
        </div>
        <input type="range" min={0} max={359} step={1} value={rot} onChange={e => setRot(Number(e.target.value))} style={{ width: '100%' }} />
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => setRot(r => (r + 359) % 360)}>◀ −1°</button>
          <button onClick={() => setRot(r => (r + 1) % 360)}>+1° ▶</button>
          <button onClick={() => setRot(r => (r + 355) % 360)}>◀◀ −5°</button>
          <button onClick={() => setRot(r => (r + 5) % 360)}>+5° ▶▶</button>
          <button onClick={() => setRot(r => (r + 90) % 360)}>+90°</button>
          <button onClick={() => setFlipU(f => !f)}>toggle flipU</button>
          <button onClick={() => setFlipV(f => !f)}>toggle flipV</button>
          <button onClick={() => setSpin(s => !s)}>{spin ? 'parar giro' : 'girar'}</button>
        </div>
        <div style={{ opacity: 0.8 }}>Ajustá hasta que la B quede derecha (probá también &quot;girar&quot; para ver las dos caras) y pasame estos 3 valores.</div>
      </div>
    </div>
  )
}

function SpinWrap({ spin, children }: { spin: boolean; children: ReactNode }) {
  const local = useRef<THREE.Group>(null)
  useEffect(() => {
    if (!spin) return
    let raf = 0
    const tick = () => { if (local.current) local.current.rotation.y += 0.01; raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [spin])
  return <group ref={local}>{children}</group>
}
