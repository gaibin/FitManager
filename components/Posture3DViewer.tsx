import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { PostureReconstruction, ReconstructionNode } from '../types';

interface Posture3DViewerProps {
  reconstruction?: PostureReconstruction;
  activeLandmarkIds?: string[];
  compact?: boolean;
  className?: string;
}

const ACTIVE = new THREE.Color('#FF9500');
const NORMAL = new THREE.Color('#007AFF');
const BONE = new THREE.Color('#B7C8E6');

function cylinderBetween(a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
  const delta = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 12), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
  return mesh;
}

const Posture3DViewer: React.FC<Posture3DViewerProps> = ({
  reconstruction, activeLandmarkIds = [], compact = false, className = '',
}) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !reconstruction?.available || !reconstruction.nodes) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#F7F8FA');
    const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
    camera.position.set(2.7, 1.5, 3.2);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xd6deea, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const grid = new THREE.GridHelper(3.8, 12, 0xcfd6e3, 0xe8ecf3);
    grid.position.y = 0;
    scene.add(grid);

    const referenceMaterial = new THREE.LineDashedMaterial({ color: 0x8e8e93, dashSize: 0.05, gapSize: 0.04 });
    const reference = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.15, 0)]),
      referenceMaterial,
    );
    reference.computeLineDistances();
    scene.add(reference);

    const nodes = reconstruction.nodes;
    const active = new Set(activeLandmarkIds);
    const nodeObjects = new Map<string, THREE.Mesh>();
    (Object.entries(nodes) as [string, ReconstructionNode][]).forEach(([name, node]) => {
      const material = new THREE.MeshStandardMaterial({
        color: active.has(name) ? ACTIVE : NORMAL,
        roughness: 0.35,
        metalness: 0.05,
      });
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(active.has(name) ? 0.045 : 0.032, 20, 16), material);
      sphere.position.set(node.x, node.y, node.z);
      sphere.userData.landmark = name;
      scene.add(sphere);
      nodeObjects.set(name, sphere);
    });

    (reconstruction.bones || []).forEach(([start, end]) => {
      const a = nodeObjects.get(start)?.position;
      const b = nodeObjects.get(end)?.position;
      if (!a || !b) return;
      const highlighted = active.has(start) || active.has(end);
      scene.add(cylinderBetween(
        a, b, highlighted ? 0.024 : 0.018,
        new THREE.MeshStandardMaterial({ color: highlighted ? ACTIVE : BONE, roughness: 0.55 }),
      ));
    });

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 2.2;
    controls.maxDistance = 6;
    controls.target.set(0, 0.9, 0);

    const resize = () => {
      const width = Math.max(host.clientWidth, 240);
      const height = Math.max(host.clientHeight, compact ? 240 : 420);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);

    let frame = 0;
    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
          else object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [reconstruction, activeLandmarkIds.join('|'), compact]);

  if (!reconstruction?.available) {
    return (
      <div className={`flex min-h-[240px] items-center justify-center rounded-2xl bg-gray-50 p-6 text-center ${className}`}>
        <div>
          <p className="text-sm font-semibold text-gray-600">2.5D 骨架不可用</p>
          <p className="mt-1 text-xs text-gray-400">{reconstruction?.reason || '需要正面与侧面标准照片'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-gray-100 bg-[#F7F8FA] ${className}`}>
      <div ref={hostRef} className={compact ? 'h-[250px]' : 'h-[440px]'} />
      <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold text-[#5856D6] shadow-sm">
        2.5D 估算 · 可旋转
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-xl bg-white/85 px-3 py-2 text-[10px] leading-relaxed text-gray-500 backdrop-blur">
        正面提供横向位置，侧面提供估算深度；不输出轴向旋转，不能替代多相机三维测量。
      </div>
    </div>
  );
};

export default Posture3DViewer;
