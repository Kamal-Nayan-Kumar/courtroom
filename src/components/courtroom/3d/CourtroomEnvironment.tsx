import {
  Text,
  Environment,
  MeshReflectorMaterial,
  RoundedBox,
} from "@react-three/drei";

export default function CourtroomEnvironment() {
  return (
    <group>
      {/* Global Illumination / Reflections - Core to realism */}
      <Environment preset="city" />

      {/* Realistic Highly Polished Courtroom Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={40}
          roughness={0.15}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#22110c"
          metalness={0.5}
          mirror={1}
        />
      </mesh>

      {/* Back Wall (Judge Area) */}
      <mesh position={[0, 15, -15]} receiveShadow>
        <boxGeometry args={[60, 40, 2]} />
        <meshStandardMaterial color="#1a0d08" roughness={0.9} />
      </mesh>

      {/* Ashoka Chakra / Indian Court Symbolism */}
      <mesh position={[0, 9, -13.8]} castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[2, 2, 0.2, 64]} />
        <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} />
      </mesh>
      <Text
        position={[0, 5, -13.8]}
        fontSize={1.2}
        color="#ffe680"
        material-toneMapped={false}
        anchorX="center"
        anchorY="middle"
      >
        SATYAMEVA JAYATE
      </Text>

      {/* Indian Flag Left */}
      <mesh position={[-6, 6, -13]} castShadow>
        <planeGeometry args={[1.5, 3]} />
        <meshStandardMaterial color="#ff9933" />
      </mesh>
      <mesh position={[-6, 4, -13]} castShadow>
        <planeGeometry args={[1.5, 3]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-6, 2, -13]} castShadow>
        <planeGeometry args={[1.5, 3]} />
        <meshStandardMaterial color="#138808" />
      </mesh>

      {/* Indian Flag Right */}
      <mesh position={[6, 6, -13]} castShadow>
        <planeGeometry args={[1.5, 3]} />
        <meshStandardMaterial color="#ff9933" />
      </mesh>
      <mesh position={[6, 4, -13]} castShadow>
        <planeGeometry args={[1.5, 3]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[6, 2, -13]} castShadow>
        <planeGeometry args={[1.5, 3]} />
        <meshStandardMaterial color="#138808" />
      </mesh>

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
