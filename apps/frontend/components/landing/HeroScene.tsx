'use client'

import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import * as THREE from 'three'
import { CoinModel } from './CoinModel'
import { OrbitRing } from './OrbitRing'
import { SparkField } from './SparkField'
import { Floor } from './Floor'
import s from './HeroScene.module.css'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const MODELS = {
  bitcoin: '/models/bitcoin-hq.glb',
  binance: '/models/binance-hq.glb',
  mercadoPago: '/models/mercado-pago-hq.glb',
}

useGLTF.preload(MODELS.bitcoin)
useGLTF.preload(MODELS.binance)
useGLTF.preload(MODELS.mercadoPago)

const COIN_Y = 2.35
const COIN_SIZE = 1.3

function Parallax({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const target = useRef({ x: 0, y: 0 })

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      const max = THREE.MathUtils.degToRad(8)
      target.current.x = -ny * max
      target.current.y = nx * max
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame(() => {
    if (!group.current) return
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, target.current.x, 4, 0.016)
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, target.current.y, 4, 0.016)
  })

  return <group ref={group}>{children}</group>
}

function Scene() {
  const bitcoinRef = useRef<THREE.Group>(null)
  const binanceRef = useRef<THREE.Group>(null)
  const mpRef = useRef<THREE.Group>(null)

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out', duration: 1.5 } })
    if (bitcoinRef.current) {
      gsap.set(bitcoinRef.current.scale, { x: 0.8, y: 0.8, z: 0.8 })
      tl.fromTo(bitcoinRef.current.position, { y: 5.5 }, { y: COIN_Y }, 0)
        .to(bitcoinRef.current.scale, { x: 1, y: 1, z: 1 }, 0)
    }
    if (binanceRef.current) {
      gsap.set(binanceRef.current.scale, { x: 0.8, y: 0.8, z: 0.8 })
      tl.to(binanceRef.current.scale, { x: 1, y: 1, z: 1 }, 0.1)
    }
    if (mpRef.current) {
      gsap.set(mpRef.current.scale, { x: 0.8, y: 0.8, z: 0.8 })
      tl.fromTo(mpRef.current.position, { y: -5.5 }, { y: -COIN_Y }, 0)
        .to(mpRef.current.scale, { x: 1, y: 1, z: 1 }, 0.1)
    }

    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: '+=600',
      scrub: 0.6,
      onUpdate: self => {
        const p = self.progress
        if (bitcoinRef.current) bitcoinRef.current.position.z = p * 0.6
        if (binanceRef.current) binanceRef.current.rotation.z = p * 0.25
        if (mpRef.current) mpRef.current.position.z = -p * 0.6
      },
    })
  }, [])

  return (
    <Parallax>
      <group ref={bitcoinRef} position={[0.25, COIN_Y, 0]}>
        <CoinModel
          url={MODELS.bitcoin}
          position={[0, 0, 0]}
          size={COIN_SIZE}
          paint={{
            base: '#f2a01f',
            relief: '#ffdf8a',
            metalness: 0.85,
            roughness: 0.2,
            emissive: '#c77a00',
            emissiveIntensity: 0.32,
          }}
          floatSpeed={0.6}
          floatAmplitude={0.16}
          spinSpeed={0.35}
        />
      </group>
      <group ref={binanceRef} position={[-0.2, 0, 0]}>
        <CoinModel
          url={MODELS.binance}
          position={[0, 0, 0]}
          size={COIN_SIZE}
          paint={{
            base: '#191a1e',
            relief: '#F0B90B',
            metalness: 0.9,
            roughness: 0.28,
            emissive: '#3d2f00',
            emissiveIntensity: 0.18,
          }}
          floatSpeed={0.5}
          floatAmplitude={0.15}
          spinSpeed={0.3}
          phase={2}
        />
      </group>
      <group ref={mpRef} position={[0.25, -COIN_Y, 0]}>
        <CoinModel
          url={MODELS.mercadoPago}
          position={[0, 0, 0]}
          size={COIN_SIZE}
          paint={{
            base: '#0a85d9',
            relief: '#f4f8ff',
            metalness: 0.75,
            roughness: 0.3,
            emissive: '#003a66',
            emissiveIntensity: 0.3,
          }}
          floatSpeed={0.55}
          floatAmplitude={0.18}
          spinSpeed={0.32}
          phase={4}
        />
      </group>

      {/* Órbitas elípticas grandes que cruzan las monedas, como en la referencia */}
      <OrbitRing position={[0.25, COIN_Y, 0]} radius={2.1} color="#ffb84d" speed={0.18} tilt={1.25} />
      <OrbitRing position={[-0.2, 0, 0]} radius={2.2} color="#f0b90b" speed={-0.14} tilt={1.32} />
      <OrbitRing position={[0.25, -COIN_Y, 0]} radius={2.1} color="#3fa9ff" speed={0.16} tilt={1.22} />

      {/* Chispas con los colores de cada marca, alrededor de su moneda */}
      <SparkField center={[0.25, COIN_Y, 0]} colors={['#f7931a', '#ffd27a']} seed={1} />
      <SparkField center={[-0.2, 0, 0]} colors={['#F0B90B', '#e9edf2']} seed={2} driftSpeed={-0.035} />
      <SparkField center={[0.25, -COIN_Y, 0]} colors={['#41A4EF', '#9ad2ff']} seed={3} driftSpeed={0.045} />
    </Parallax>
  )
}

/** Luces, piso y postprocesado — fijos, fuera del parallax del mouse. */
function Stage() {
  return (
    <>
      <Floor />

      <ambientLight intensity={0.4} />
      <directionalLight position={[4, 6, 5]} intensity={2} color="#ffdca6" />
      <directionalLight position={[-4, -2, -3]} intensity={0.6} color="#2f6bb0" />
      <Environment resolution={64} environmentIntensity={0.55}>
        <Lightformer form="rect" color="#fff3d6" intensity={2.4} position={[3, 4, 4]} scale={[4, 4, 1]} />
        <Lightformer form="rect" color="#bfe3ff" intensity={0.9} position={[-4, -2, 3]} scale={[3, 4, 1]} />
      </Environment>

      <EffectComposer multisampling={0}>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.5} luminanceSmoothing={0.25} radius={0.75} />
      </EffectComposer>
    </>
  )
}

interface ChipProps {
  value: string
  label: string
  icon?: string
  alt?: string
  valueGreen?: boolean
  labelGreen?: boolean
}

function Chip({ value, label, icon, alt, valueGreen, labelGreen }: ChipProps) {
  return (
    <div className={s.chip}>
      {icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt={alt ?? ''} className={s.chipIcon} />
      )}
      <div className={s.chipText}>
        <span className={`${s.chipValue} ${valueGreen ? s.green : ''}`}>{value}</span>
        <span className={`${s.chipLabel} ${labelGreen ? s.green : ''}`}>{label}</span>
      </div>
    </div>
  )
}

export function HeroScene() {
  return (
    <div className={s.canvasWrap}>
      <Canvas
        aria-hidden="true"
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        camera={{ fov: 45, position: [0, 0.7, 11] }}
        style={{ background: 'transparent' }}
      >
        <Scene />
        <Stage />
      </Canvas>

      <div className={`${s.chipCol} ${s.chipColLeft}`} aria-hidden="true">
        <Chip value="+US$ 150" label="Ganancia hoy" valueGreen />
        <Chip value="ARS / USD" label="+0,85%" labelGreen />
        <Chip value="Tu patrimonio" label="+4,21%" labelGreen />
      </div>
      <div className={`${s.chipCol} ${s.chipColRight}`} aria-hidden="true">
        <Chip value="BTC" label="Bitcoin" icon="/crypto/btc.svg" alt="Bitcoin" />
        <Chip value="BNB" label="Binance Coin" icon="/providers/binance.svg" alt="Binance" />
        <Chip value="MP" label="Mercado Pago" icon="/providers/mercado-pago.svg" alt="Mercado Pago" />
      </div>
    </div>
  )
}
