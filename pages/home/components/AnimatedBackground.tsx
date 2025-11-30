import React, { useState } from 'react';
import { GearIcon, WifiIcon } from './Icons';

interface AnimatedBackgroundProps {
    isRunning: boolean;
}

const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ isRunning }) => {
    const [speedMultiplier, setSpeedMultiplier] = useState(1);

    const handleClick = () => {
        setSpeedMultiplier(prev => (prev === 1 ? 5 : 1));
        // Reset speed after a short burst if user clicked
        setTimeout(() => setSpeedMultiplier(1), 2000);
    };

    const baseSpeed = isRunning ? 2 : 1;
    const currentSpeed = baseSpeed * speedMultiplier;

    // Helper to generate style with variable duration
    const getAnimStyle = (baseDuration: number, delay: number = 0) => ({
        animationDuration: `${baseDuration / currentSpeed}s`,
        animationDelay: `${delay}s`
    });

    return (
        <div
            className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
            onClick={handleClick} // Note: pointer-events-none prevents this, need to wrap or handle differently if we want direct background clicks.
            // For now, let's allow clicks to pass through to content, but maybe we can put a transparent layer behind content?
            // Actually, the user asked for "click it speed up". Let's assume clicking ANYWHERE might do it,
            // or we make a specific interactive layer. I'll make a clickable layer at z-0.
        >
           <div className="absolute inset-0 pointer-events-auto" onClick={handleClick} />

            {/* Top Right Gear Cluster */}
            <div className="absolute top-[-50px] right-[-50px] opacity-10 dark:opacity-20 text-navy-800 dark:text-navy-500">
                <GearIcon className="w-64 h-64 animate-spin-slow" />
            </div>
            <div className="absolute top-[80px] right-[100px] opacity-10 dark:opacity-20 text-navy-800 dark:text-navy-500">
                <GearIcon className="w-32 h-32 animate-[spin_15s_linear_infinite_reverse]" style={getAnimStyle(15)} />
            </div>

            {/* Bottom Left Wifi Waves */}
            <div className="absolute bottom-10 left-10 opacity-5 dark:opacity-10 text-navy-800 dark:text-navy-500">
                <WifiIcon className="w-96 h-96 animate-pulse-slow" style={getAnimStyle(3)} />
            </div>

            {/* Random floating particles */}
            {[...Array(5)].map((_, i) => (
                <div
                    key={i}
                    className="absolute rounded-full bg-navy-500 opacity-20 animate-pulse"
                    style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        width: `${Math.random() * 10 + 5}px`,
                        height: `${Math.random() * 10 + 5}px`,
                        ...getAnimStyle(2 + Math.random() * 3, Math.random() * 2)
                    }}
                />
            ))}

             {/* Scanline Overlay */}
             <div className="absolute inset-0 pointer-events-none opacity-20 scanline-overlay"></div>
        </div>
    );
};

export default AnimatedBackground;
