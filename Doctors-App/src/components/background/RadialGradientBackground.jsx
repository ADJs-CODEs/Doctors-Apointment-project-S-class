import React from 'react'

const RadialGradientBackground = ({ variant = 'hero' }) => {
  // Define positions for different pages
  const variants = {
    hero: [
      { pos: '-top-[10%] -left-[10%]', color: 'bg-primary/20', size: 'w-[600px] h-[600px]' },
      { pos: 'top-[20%] -right-[5%]', color: 'bg-primary/10', size: 'w-[400px] h-[400px]' },
    ],
    about: [
      { pos: 'bottom-0 left-[20%]', color: 'bg-primary/15', size: 'w-[700px] h-[700px]' },
    ],
  };

  const activeGradients = variants[variant] || variants.hero;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {activeGradients.map((orb, index) => (
        <div
          key={index}
          className={`absolute ${orb.pos} ${orb.size} ${orb.color} rounded-full blur-[120px] opacity-60 animate-pulse`}
          style={{ animationDuration: '8s' }}
        />
      ))}

      {/* Optional: Subtle Grid Overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  )
}

export default RadialGradientBackground