import React, { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

export default function PinkComputer(props) {
  const { nodes, materials, scene } = useGLTF('/pink_computer/scene.gltf');
  const group = useRef();

  useFrame((state) => {
    if (group.current) {
      // Gentle floating animation
      group.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1 - 1;
    }
  });

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={scene} />
    </group>
  );
}

// Preload the model
useGLTF.preload('/pink_computer/scene.gltf');
