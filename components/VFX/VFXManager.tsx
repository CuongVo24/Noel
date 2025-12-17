import React from 'react';
import { useVFXStore } from '../../store/vfxStore';
import { Fireworks } from '../Fireworks';
import { ConfettiExplosion } from './ConfettiExplosion';
import { Meteor } from './Meteor';

export const VFXManager: React.FC = () => {
    const fireworks = useVFXStore((state) => state.fireworks);
    const explosions = useVFXStore((state) => state.explosions);
    const meteors = useVFXStore((state) => state.meteors);
    
    const removeFirework = useVFXStore((state) => state.removeFirework);
    const removeExplosion = useVFXStore((state) => state.removeExplosion);
    const removeMeteor = useVFXStore((state) => state.removeMeteor);

    return (
        <group>
            {fireworks.map((fw) => (
                <Fireworks 
                    key={fw.id}
                    position={[fw.position.x, fw.position.y, fw.position.z]} 
                    onComplete={() => removeFirework(fw.id)} 
                />
            ))}

            {explosions.map((exp) => (
                <ConfettiExplosion 
                    key={exp.id} 
                    position={exp.position} 
                    color={exp.color} 
                    onComplete={() => removeExplosion(exp.id)} 
                />
            ))}

            {meteors.map((m) => (
                <Meteor 
                    key={m.id}
                    startPos={m.startPos}
                    endPos={m.endPos}
                    onComplete={() => removeMeteor(m.id)}
                />
            ))}
        </group>
    );
};