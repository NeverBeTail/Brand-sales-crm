import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Particle {
  id: string;
  targetX: number;
  targetY: number;
  size: number;
  color: string;
  shape: "rect" | "circle" | "triangle";
  rotation: number;
  tilt: number;
  delay: number;
  duration: number;
}

interface ConfettiEffectProps {
  active: boolean;
  onComplete?: () => void;
}

export function ConfettiEffect({ active, onComplete }: ConfettiEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (active) {
      const colors = [
        "#FFC107", "#FF5722", "#E91E63", "#9C27B0", "#3F51B5", 
        "#00BCD4", "#4CAF50", "#8BC34A", "#10B981", "#EC4899", 
        "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444"
      ];
      const shapes: ("rect" | "circle" | "triangle")[] = ["rect", "circle", "triangle"];
      
      const newParticles: Particle[] = Array.from({ length: 50 }).map((_, i) => {
        const id = `${Date.now()}-${i}-${Math.random()}`;
        
        // Spread particles outward from the center
        const angle = -Math.PI / 2 + (Math.random() * 1.4 - 0.7); // mostly upwards spread (-90 deg +/- 40 deg)
        const distance = Math.random() * 180 + 70;
        
        const targetX = Math.cos(angle) * distance;
        // Gravity pull makes it fall down in the end, starting with an upward trajectory
        const targetY = Math.sin(angle) * distance + (Math.random() * 60 + 80); 

        return {
          id,
          targetX,
          targetY,
          size: Math.random() * 8 + 5,
          color: colors[Math.floor(Math.random() * colors.length)],
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          rotation: Math.random() * 720 - 360,
          tilt: Math.random() * 360,
          delay: Math.random() * 0.1,
          duration: Math.random() * 1.3 + 1.0, // Between 1.0s and 2.3s
        };
      });

      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        if (onComplete) {
          onComplete();
        }
      }, 2600);

      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30 flex items-center justify-center">
      <AnimatePresence>
        {particles.map((p) => {
          return (
            <motion.div
              key={p.id}
              initial={{ 
                opacity: 1, 
                scale: 0, 
                x: 0, 
                y: 0,
                rotate: 0,
                rotateX: 0,
                rotateY: 0
              }}
              animate={{
                opacity: [1, 1, 0.9, 0],
                scale: [0, 1.2, 1, 0.7],
                x: [0, p.targetX * 0.4, p.targetX, p.targetX + (Math.random() * 20 - 10)],
                y: [0, p.targetY * -0.6, p.targetY * 0.2, p.targetY],
                rotate: [0, p.rotation * 0.5, p.rotation],
                rotateX: [0, p.tilt * 2, p.tilt * 4],
                rotateY: [0, p.tilt * 1.5, p.tilt * 3],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: "easeOut",
              }}
              className="absolute left-1/2 top-1/2"
              style={{
                width: p.size,
                height: p.shape === "rect" ? p.size * 1.4 : p.size,
                backgroundColor: p.shape !== "triangle" ? p.color : "transparent",
                borderRadius: p.shape === "circle" ? "50%" : p.shape === "rect" ? "2px" : "0",
                borderLeft: p.shape === "triangle" ? `${p.size / 2}px solid transparent` : "none",
                borderRight: p.shape === "triangle" ? `${p.size / 2}px solid transparent` : "none",
                borderBottom: p.shape === "triangle" ? `${p.size}px solid ${p.color}` : "none",
              }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
