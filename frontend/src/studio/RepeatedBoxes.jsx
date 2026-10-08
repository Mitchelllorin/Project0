import React,{useLayoutEffect,useRef} from 'react';
import '@react-three/fiber';
import * as THREE from 'three';

// Shared geometry/material and one draw call for all repeated tile components.
export function RepeatedBoxes({instances,material}) {
  const mesh=useRef();
  useLayoutEffect(()=>{
    const object=new THREE.Object3D();
    instances.forEach((instance,index)=>{object.position.set(...instance.position);object.scale.set(...instance.size);object.updateMatrix();mesh.current.setMatrixAt(index,object.matrix);});
    mesh.current.instanceMatrix.needsUpdate=true;mesh.current.computeBoundingSphere();
  },[instances]);
  return <instancedMesh ref={mesh} args={[null,null,instances.length]} receiveShadow><boxGeometry args={[1,1,1]}/><meshStandardMaterial {...material}/></instancedMesh>;
}