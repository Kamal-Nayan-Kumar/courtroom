import {
  Text,
  Environment,
  MeshReflectorMaterial,
  RoundedBox,
  Billboard,
} from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import * as THREE from "three";

const goldMaterial = <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />;

function ScaleOfJustice({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} scale={[0.8, 0.8, 0.8]}>
      {/* Base */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.6, 0.2, 32]} />
        {goldMaterial}
      </mesh>
      {/* Center Pillar */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 2.2, 16]} />
        {goldMaterial}
      </mesh>
      {/* Top Beam */}
      <mesh position={[0, 2.3, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 3, 16]} />
        {goldMaterial}
      </mesh>
      {/* Left Pan */}
      <group position={[-1.4, 2.3, 0]}>
        <mesh position={[0, -0.6, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 1.2]} />
          {goldMaterial}
        </mesh>
        <mesh position={[0, -1.2, 0]} castShadow>
          <cylinderGeometry args={[0.4, 0.3, 0.1, 32]} />
          {goldMaterial}
        </mesh>
      </group>
      {/* Right Pan */}
      <group position={[1.4, 2.3, 0]}>
        <mesh position={[0, -0.6, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 1.2]} />
          {goldMaterial}
        </mesh>
        <mesh position={[0, -1.2, 0]} castShadow>
          <cylinderGeometry args={[0.4, 0.3, 0.1, 32]} />
          {goldMaterial}
        </mesh>
      </group>
    </group>
  );
}

const woodMaterial = <meshStandardMaterial color="#4a2e15" roughness={0.6} metalness={0.1} />;

function Gavel({ position }: { position: [number, number, number] }) {
  // Rotate the group positively on the Y axis so the handle 
  // (which extends on +X) points backwards towards the judge (-Z)
  return (
    <group position={position} rotation={[0, Math.PI / 2.2, 0]}>
      {/* Sound Block (Base) */}
      <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 0.6, 0.1, 32]} />
        {woodMaterial}
      </mesh>
      {/* Handle */}
      <mesh position={[0.5, 0.15, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.08, 0.06, 1.5, 16]} />
        {woodMaterial}
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.25, 0.8, 32]} />
        {woodMaterial}
      </mesh>
    </group>
  );
}

function LadyOfJustice({ position, rotation }: { position: [number, number, number], rotation: [number, number, number] }) {
  const texture = useLoader(THREE.TextureLoader, '/lady_of_justice.png');
  
  return (
    <group position={position} rotation={rotation}>
      <Billboard follow={true} lockX={false} lockY={true} lockZ={false}>
        {/* Set Y position to half the height so the bottom firmly rests on the group origin */}
        <mesh position={[0, 5.5, 0]} frustumCulled={false}>
          <planeGeometry args={[7, 11]} />
          <meshBasicMaterial 
            map={texture} 
            transparent={true} 
            side={THREE.DoubleSide} 
            toneMapped={false}
          />
        </mesh>
      </Billboard>
    </group>
  );
}

export default function CourtroomEnvironment() {
  return (
    <group>
      {/* Global Illumination / Reflections - Core to realism */}
      <Environment preset="city" />

      {/* Realistic Highly Polished Courtroom Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <MeshReflectorMaterial
          blur={[100, 50]}
          resolution={512}
          mixBlur={1}
          mixStrength={10}
          roughness={0.15}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#22110c"
          metalness={0.5}
          mirror={1}
        />
      </mesh>

      {/* Lady of Justice Statue (Behind Judge, Left) */}
      <LadyOfJustice position={[-6, -2, -12.5]} rotation={[0, 0.4, 0]} />

      {/* Back Wall (Judge Area) */}
      <mesh position={[0, 15, -20]} receiveShadow>
        <boxGeometry args={[80, 40, 2]} />
        <meshStandardMaterial color="#1a0d08" roughness={0.9} />
      </mesh>

      {/* Ashoka Chakra / Indian Court Symbolism */}
      <mesh position={[0, 9, -14.2]} castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2, 2, 0.2, 64]} />
        <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} />
      </mesh>

      <Text
        position={[0, 6.5, -14.1]}
        fontSize={0.85}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}
      >
        <meshBasicMaterial color="#ffe680" toneMapped={false} />
        SATYAMEVA JAYATE
      </Text>

      {/* Indian Flag Left */}
      <group position={[-11, 5, -14.5]}>
        <mesh position={[0, 1, 0]} castShadow>
          <planeGeometry args={[4, 1]} />
          <meshStandardMaterial color="#ff9933" />
        </mesh>
        <mesh position={[0, 0, 0]} castShadow>
          <planeGeometry args={[4, 1]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, -1, 0]} castShadow>
          <planeGeometry args={[4, 1]} />
          <meshStandardMaterial color="#138808" />
        </mesh>
        {/* Ashoka Chakra in the middle of flag */}
        <mesh position={[0, 0, 0.01]} castShadow>
          <circleGeometry args={[0.3, 32]} />
          <meshStandardMaterial color="#000080" />
        </mesh>
      </group>

      {/* Indian Flag Right */}
      <group position={[11, 5, -14.5]}>
        <mesh position={[0, 1, 0]} castShadow>
          <planeGeometry args={[4, 1]} />
          <meshStandardMaterial color="#ff9933" />
        </mesh>
        <mesh position={[0, 0, 0]} castShadow>
          <planeGeometry args={[4, 1]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
        <mesh position={[0, -1, 0]} castShadow>
          <planeGeometry args={[4, 1]} />
          <meshStandardMaterial color="#138808" />
        </mesh>
        {/* Ashoka Chakra in the middle of flag */}
        <mesh position={[0, 0, 0.01]} castShadow>
          <circleGeometry args={[0.3, 32]} />
          <meshStandardMaterial color="#000080" />
        </mesh>
      </group>

      {/* Judge Bench (Center High) */}
      <RoundedBox
        args={[12, 5, 4]}
        position={[0, 0.5, -9]}
        castShadow
        receiveShadow
        radius={0.1}
        smoothness={4}
      >
        <meshStandardMaterial color="#2d170b" roughness={0.3} metalness={0.1} />
      </RoundedBox>

      {/* Judge Podium / Strike Table */}
      <RoundedBox
        args={[13, 0.5, 2.2]}
        position={[0, 3.2, -7.5]}
        castShadow
        receiveShadow
        radius={0.05}
        smoothness={4}
      >
        <meshStandardMaterial color="#1a0d06" roughness={0.1} metalness={0.6} />
      </RoundedBox>

      {/* Symbol of Justice representing balance */}
      <ScaleOfJustice position={[4, 3.45, -7]} />

      {/* The Judge's Gavel */}
      <Gavel position={[-3, 3.45, -7]} />

      {/* Defender Bench */}
      <RoundedBox
        args={[6, 3.5, 2.5]}
        position={[8, -0.5, -2]}
        rotation={[0, -0.4, 0]}
        castShadow
        receiveShadow
        radius={0.1}
        smoothness={4}
      >
        <meshStandardMaterial color="#2d170b" roughness={0.3} metalness={0.1} />
      </RoundedBox>
      <Text
        position={[8, 0, -0.6]}
        rotation={[0, -0.4, 0]}
        fontSize={0.6}
        color="#e0cfa4"
        material-toneMapped={false}
      >
        DEFENSE
      </Text>

      {/* Prosecutor Bench */}
      <RoundedBox
        args={[6, 3.5, 2.5]}
        position={[-8, -0.5, -2]}
        rotation={[0, 0.4, 0]}
        castShadow
        receiveShadow
        radius={0.1}
        smoothness={4}
      >
        <meshStandardMaterial color="#2d170b" roughness={0.3} metalness={0.1} />
      </RoundedBox>
      <Text
        position={[-8, 0, -0.6]}
        rotation={[0, 0.4, 0]}
        fontSize={0.6}
        color="#e0cfa4"
        material-toneMapped={false}
      >
        PROSECUTION
      </Text>

      {/* Witness Stand */}
      <RoundedBox
        args={[4, 3, 2]}
        position={[0, -0.5, -3]}
        castShadow
        receiveShadow
        radius={0.1}
        smoothness={4}
      >
        <meshStandardMaterial color="#2d170b" roughness={0.3} metalness={0.1} />
      </RoundedBox>
      <Text
        position={[0, -0.2, -1.9]}
        fontSize={0.5}
        color="#e0cfa4"
        material-toneMapped={false}
      >
        WITNESS
      </Text>

      {/* Gallery / Audience Benches & People */}
      {[6, 10, 14].map((z, idx) => (
        <group key={`gallery-${idx}`}>
          {/* Left Benches & Audience */}
          <mesh position={[-6, -1.5, z]} castShadow receiveShadow>
            <boxGeometry args={[8, 1, 1.5]} />
            <meshStandardMaterial color="#1a0f0a" />
          </mesh>
          <mesh position={[-4, -0.25, z]} castShadow>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial color="#8b5a2b" />
          </mesh>
          <mesh position={[-8, -0.25, z]} castShadow>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial color="#3d2a1b" />
          </mesh>

          {/* Right Benches & Audience */}
          <mesh position={[6, -1.5, z]} castShadow receiveShadow>
            <boxGeometry args={[8, 1, 1.5]} />
            <meshStandardMaterial color="#1a0f0a" />
          </mesh>
          <mesh position={[4, -0.25, z]} castShadow>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial color="#3d2a1b" />
          </mesh>
          <mesh position={[8, -0.25, z]} castShadow>
            <sphereGeometry args={[0.4, 16, 16]} />
            <meshStandardMaterial color="#8b5a2b" />
          </mesh>
        </group>
      ))}

      {/* Indian Policemen / Guards at the back corners */}
      <group position={[-12, 0.5, 4]} rotation={[0, 1, 0]}>
        {/* Khaki Uniform */}
        <mesh castShadow>
          <boxGeometry args={[1.5, 5, 1]} />
          <meshStandardMaterial color="#7a6b4b" />
        </mesh>
        {/* Guard Hat */}
        <mesh position={[0, 2.6, 0]} castShadow>
          <cylinderGeometry args={[0.7, 0.7, 0.3, 16]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <Text position={[0, 3.5, 0]} fontSize={0.4} color="white">
          POLICE
        </Text>
      </group>

      <group position={[12, 0.5, 4]} rotation={[0, -1, 0]}>
        {/* Khaki Uniform */}
        <mesh castShadow>
          <boxGeometry args={[1.5, 5, 1]} />
          <meshStandardMaterial color="#7a6b4b" />
        </mesh>
        {/* Guard Hat */}
        <mesh position={[0, 2.6, 0]} castShadow>
          <cylinderGeometry args={[0.7, 0.7, 0.3, 16]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        <Text position={[0, 3.5, 0]} fontSize={0.4} color="white">
          POLICE
        </Text>
      </group>

      {/* Basic Cinematic Lighting Configured For Realism */}
      <ambientLight intensity={0.4} color="#f0f5ff" />
      <directionalLight
        position={[0, 20, 10]}
        intensity={1.5}
        color="#fffcf5"
        castShadow
        shadow-mapSize={[2048, 2048]}
      />

      {/* Dynamic Spotlights tracking Benches */}
      <spotLight
        position={[0, 15, -4]}
        angle={0.4}
        penumbra={0.7}
        intensity={300}
        color="#ffeaab"
        castShadow
        target-position={[0, 0, -10]}
      />
      <spotLight
        position={[8, 15, 2]}
        angle={0.3}
        penumbra={0.8}
        intensity={200}
        color="#d4e1ff"
        target-position={[8, 0, -2]}
      />
      <spotLight
        position={[-8, 15, 2]}
        angle={0.3}
        penumbra={0.8}
        intensity={200}
        color="#ffdbdb"
        target-position={[-8, 0, -2]}
      />
    </group>
  );
}
