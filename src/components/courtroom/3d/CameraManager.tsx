import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Speaker } from "@/types/courtroom";
import { useMemo } from "react";

export default function CameraManager({
  activeSpeaker,
}: {
  activeSpeaker: Speaker;
}) {
  const targetPos = useMemo(() => new THREE.Vector3(0, 6, 12), []);
  const targetLookAt = useMemo(() => new THREE.Vector3(0, 0, -5), []);
  const currentLookAt = useMemo(() => new THREE.Vector3(0, 0, -5), []);

  useFrame((state) => {
    switch (activeSpeaker) {
      case "judge":
        // Close up on Judge
        targetPos.set(0, 5, -2);
        targetLookAt.set(0, 4, -10);
        break;
      case "defender":
        // Camera looks at Defender (Right) from slightly center-left
        targetPos.set(2, 3, 5);
        targetLookAt.set(8, 2, -2);
        break;
      case "prosecutor":
        // Camera looks at Prosecutor (Left) from slightly center-right
        targetPos.set(-2, 3, 5);
        targetLookAt.set(-8, 2, -2);
        break;
      case "system":
      default:
        // Wide cinematic shot
        targetPos.set(0, 8, 14);
        targetLookAt.set(0, 2, -5);
        break;
    }

    // Smooth movement
    state.camera.position.lerp(targetPos, 0.03);
    currentLookAt.lerp(targetLookAt, 0.04);
    state.camera.lookAt(currentLookAt);
  });

  return null;
}
