import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Billboard } from "@react-three/drei";
import { Speaker } from "@/types/courtroom";

interface CharacterModelProps {
  role: Speaker;
  isTalking: boolean;
  color?: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  characterId: string; // The selected ID from CharacterSelection
}

export default function CharacterModel({
  role,
  isTalking,
  color = "#ffffff",
  position,
  rotation = [0, 0, 0],
  characterId,
}: CharacterModelProps) {
  const group = useRef<THREE.Group>(null);

  // Use state and TextureLoader directly to handle 404s gracefully without Suspense crashing React
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.load(
      `/characters/${role}.png`,
      (loadedTexture) => {
        setTexture(loadedTexture);
      },
      undefined,
      (err) => {
        console.warn(
          `Could not load texture for ${role}. Fallback to color/box.`,
          err,
        );
      },
    );
  }, [role]);

  // Simplified animation - removed the shaking/floating that causes clipping
  useFrame((state) => {
    if (group.current) {
      if (isTalking) {
        // Slight color pulse or subtle hint of talking instead of shaking
        group.current.scale.set(1.02, 1.02, 1.02);
      } else {
        group.current.scale.set(1, 1, 1);
      }
    }
  });

  return (
    <group ref={group} position={position} rotation={rotation}>
      {/* 
        lockY={true} prevents the image from tilting up/down and clipping into the desk 
        when the camera pans. It only rotates around the Y axis to face you.
      */}
      <Billboard follow={true} lockX={false} lockY={true} lockZ={false}>
        {/* Adjusted position to sit flat instead of floating up 1.5 units */}
        <mesh castShadow receiveShadow position={[0, 2.5, 0]}>
          <planeGeometry args={[4, 5]} />
          <meshStandardMaterial
            map={texture}
            transparent={true}
            alphaTest={0.5} // Sharper transparency clipping
            side={THREE.DoubleSide}
          />
        </mesh>
      </Billboard>
    </group>
  );
}
