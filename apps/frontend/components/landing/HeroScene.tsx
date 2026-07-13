'use client'

import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import * as THREE from 'three'
import { CoinModel } from './CoinModel'
import { GravityField } from './GravityField'
import { RadarWaves } from './RadarWaves'
import { EnergyStream } from './EnergyStream'
import { SparkField } from './SparkField'
import { Floor } from './Floor'
import s from './HeroScene.module.css'

gsap.registerPlugin(useGSAP, ScrollTrigger)

// Los .glb viven en `public/models/`. Vienen solo con POSITION (sin materiales,
// ni normales, ni UVs), así que a cada uno se le proyecta la imagen real de su
// logo sobre las caras (`logo`) y `paint.base` le da color al canto.
const MODELS = {
  bitcoin: '/models/Bitcoin_Logo.glb',
  binance: '/models/Binance_Logo.glb',
  usdt: '/models/USDT_Logo.glb',
}

// Orientación del logo de Bitcoin sobre la moneda. La "B" del .glb queda ~10°
// ladeada, así que se corrige acá (solo para BTC). Referencia estable para no
// recalcular el UV en cada render.
const BTC_LOGO_UV = { rotationDeg: 10 }

useGLTF.preload(MODELS.bitcoin)
useGLTF.preload(MODELS.binance)
useGLTF.preload(MODELS.usdt)

const COIN_Y = 2.35
const COIN_SIZE = 1.5

// Profundidad real: cada moneda vive en su propio plano Z.
const BTC_POS: [number, number, number] = [0.25, COIN_Y, 1.1]
const BNB_POS: [number, number, number] = [-0.2, 0, 0]
const USDT_POS: [number, number, number] = [0.25, -COIN_Y, -1.3]

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
  const usdtRef = useRef<THREE.Group>(null)

  useGSAP(() => {
    // Entrada escalonada: fondo → BTC → BNB → USDT (las cards siguen en HTML)
    const tl = gsap.timeline({ defaults: { ease: 'power4.out', duration: 1.3 } })
    if (bitcoinRef.current) {
      gsap.set(bitcoinRef.current.scale, { x: 0.8, y: 0.8, z: 0.8 })
      tl.fromTo(bitcoinRef.current.position, { y: 5.5 }, { y: COIN_Y }, 0.55)
        .to(bitcoinRef.current.scale, { x: 1, y: 1, z: 1 }, 0.55)
    }
    if (binanceRef.current) {
      gsap.set(binanceRef.current.scale, { x: 0.8, y: 0.8, z: 0.8 })
      tl.to(binanceRef.current.scale, { x: 1, y: 1, z: 1 }, 0.75)
    }
    if (usdtRef.current) {
      gsap.set(usdtRef.current.scale, { x: 0.8, y: 0.8, z: 0.8 })
      tl.fromTo(usdtRef.current.position, { y: -5.5 }, { y: -COIN_Y }, 0.95)
        .to(usdtRef.current.scale, { x: 1, y: 1, z: 1 }, 0.95)
    }

    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: '+=600',
      scrub: 0.6,
      onUpdate: self => {
        const p = self.progress
        if (bitcoinRef.current) bitcoinRef.current.position.z = BTC_POS[2] + p * 0.5
        if (binanceRef.current) binanceRef.current.rotation.z = p * 0.25
        if (usdtRef.current) usdtRef.current.position.z = USDT_POS[2] - p * 0.5
      },
    })
  }, [])

  return (
    <Parallax>
      {/* BTC: campo gravitacional de partículas doradas */}
      <group ref={bitcoinRef} position={BTC_POS}>
        <CoinModel
          url={MODELS.bitcoin}
          position={[0, 0, 0]}
          size={COIN_SIZE}
          tilt={THREE.MathUtils.degToRad(12)}
          paint={{ base: '#F7931A', metalness: 0.6, roughness: 0.28, emissive: '#F7931A', emissiveIntensity: 0.16 }}
          logo="/crypto/btc.svg"
          logoUV={BTC_LOGO_UV}
          floatSpeed={0.6}
          floatAmplitude={0.14}
          spinSpeed={0.12}
        />
      </group>
      <GravityField center={BTC_POS} colors={['#ffd27a', '#f7931a', '#fff2cf']} count={46} seed={1} />

      {/* BNB: intercambio — ondas que deforman el aire + partículas doradas */}
      <group ref={binanceRef} position={BNB_POS}>
        <CoinModel
          url={MODELS.binance}
          position={[0, 0, 0]}
          size={COIN_SIZE}
          tilt={THREE.MathUtils.degToRad(-6)}
          paint={{ base: '#F0B90B', metalness: 0.65, roughness: 0.3, emissive: '#F0B90B', emissiveIntensity: 0.14 }}
          logo="/models/binance-face.svg"
          floatSpeed={0.5}
          floatAmplitude={0.13}
          spinSpeed={0.085}
          phase={2}
        />
      </group>
      <GravityField center={BNB_POS} colors={['#F0B90B', '#e9edf2']} count={24} radiusMin={1.6} radiusMax={2.4} seed={2} size={0.045} />
      <RadarWaves center={BNB_POS} color="#F0B90B" period={3.2} count={2} maxScale={2} y={-0.7} opacity={0.3} />

      {/* USDT: estabilidad — ondas verdes tipo radar que pulsan */}
      <group ref={usdtRef} position={USDT_POS}>
        <CoinModel
          url={MODELS.usdt}
          position={[0, 0, 0]}
          size={COIN_SIZE}
          tilt={THREE.MathUtils.degToRad(8)}
          paint={{ base: '#26A17B', metalness: 0.6, roughness: 0.3, emissive: '#26A17B', emissiveIntensity: 0.18 }}
          logo="/crypto/usdt.svg"
          floatSpeed={0.55}
          floatAmplitude={0.15}
          spinSpeed={0.1}
          phase={4}
        />
      </group>
      <RadarWaves center={USDT_POS} color="#26A17B" period={2} count={3} maxScale={2.6} y={-0.8} opacity={0.5} />
      <GravityField center={USDT_POS} colors={['#26A17B', '#7fe0bd']} count={18} radiusMin={1.6} radiusMax={2.3} seed={3} size={0.04} />

      {/* Energía que fluye de una moneda a la siguiente */}
      <EnergyStream from={[BTC_POS[0], BTC_POS[1] - 1, BTC_POS[2]]} to={[BNB_POS[0], BNB_POS[1] + 1, BNB_POS[2]]} color="#ffcf7a" seed={1} />
      <EnergyStream from={[BNB_POS[0], BNB_POS[1] - 1, BNB_POS[2]]} to={[USDT_POS[0], USDT_POS[1] + 1, USDT_POS[2]]} color="#7ec4f7" seed={2} />

      {/* Partículas ambientales lejanas, pocas y variadas */}
      <SparkField center={[0, 0, -2.5]} colors={['#ffd27a', '#ffffff', '#6fc3ff']} count={30} innerRadius={3.6} outerRadius={5.5} seed={7} driftSpeed={0.015} />
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
        <DepthOfField worldFocusDistance={11} worldFocusRange={5.5} bokehScale={2.2} />
      </EffectComposer>
    </>
  )
}

/** Cámara que flota apenas, como si respirara — nunca queda quieta. */
function CameraRig() {
  useFrame(({ camera, clock }) => {
    const t = clock.getElapsedTime()
    camera.position.x = Math.sin(t * 0.22) * 0.15
    camera.position.y = 0.7 + Math.cos(t * 0.17) * 0.08
    camera.lookAt(0, 0, 0)
  })
  return null
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
  const root = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    // Las cards entran al final de la secuencia (después de las monedas)
    const chips = root.current?.querySelectorAll(`.${s.chip}`)
    if (!chips?.length) return
    gsap.set(chips, { autoAlpha: 0, y: 14 })
    gsap.to(chips, { autoAlpha: 1, y: 0, delay: 1.3, duration: 0.7, stagger: 0.08, ease: 'power2.out', clearProps: 'transform' })
  }, { scope: root })

  return (
    <div className={s.canvasWrap} ref={root}>
      <Canvas
        aria-hidden="true"
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        camera={{ fov: 45, position: [0, 0.7, 11] }}
        style={{ background: 'transparent' }}
      >
        <Scene />
        <Stage />
        <CameraRig />
      </Canvas>

      <div className={`${s.chipCol} ${s.chipColLeft}`} aria-hidden="true">
        <Chip value="+US$ 150" label="Ganancia hoy" valueGreen />
        <Chip value="ARS / USD" label="+0,85%" labelGreen />
        <Chip value="Tu patrimonio" label="+4,21%" labelGreen />
      </div>
      <div className={`${s.chipCol} ${s.chipColRight}`} aria-hidden="true">
        <Chip value="BTC" label="Bitcoin" icon="/crypto/btc.svg" alt="Bitcoin" />
        <Chip value="BNB" label="Binance Coin" icon="/providers/binance.svg" alt="Binance" />
        <Chip value="USDT" label="Tether" icon="/crypto/usdt.svg" alt="Tether" />
      </div>
    </div>
  )
}
