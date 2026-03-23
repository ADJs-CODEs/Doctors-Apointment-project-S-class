import React from 'react'
import { ExternalLink, Github } from 'lucide-react'

const ProjectCard = ({ project }) => {
  // These variables come from your backend data
  const { title, description, image, technologies, demoUrl, githubUrl } = project;

  return (
    <div className='group relative bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-primary/40 transition-all duration-500'>

      {/* Image Container with Glow Overlay */}
      <div className='relative h-64 overflow-hidden'>
        <img
          src={image}
          alt={title}
          className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
        />
        {/* The "Video" style dark-to-transparent gradient */}
        <div className='absolute inset-0 bg-gradient-to-t from-[#030303] via-transparent to-transparent opacity-80' />
      </div>

      {/* Content Area */}
      <div className='p-6 relative z-10'>
        <h3 className='text-xl font-bold text-white mb-2 group-hover:text-primary transition-colors'>
          {title}
        </h3>
        <p className='text-white/50 text-sm leading-relaxed mb-4 line-clamp-2'>
          {description}
        </p>

        {/* Tech Stack - Mapping from your Backend Array */}
        <div className='flex flex-wrap gap-2 mb-6'>
          {technologies?.map((tech, index) => (
            <span key={index} className='px-2 py-1 text-[10px] uppercase tracking-wider font-bold bg-white/5 border border-white/10 text-white/40 rounded'>
              {tech}
            </span>
          ))}
        </div>

        {/* Action Buttons */}
        <div className='flex gap-3'>
          <a href={demoUrl} className='flex-1 py-2 bg-primary text-black text-center font-bold rounded-lg text-sm hover:brightness-110 transition-all'>
            View Project
          </a>
          <a href={githubUrl} className='p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all'>
            <Github className='w-5 h-5 text-white/60' />
          </a>
        </div>
      </div>

      {/* Animated Border bottom */}
      <div className='absolute bottom-0 left-0 h-[1px] w-0 bg-primary group-hover:w-full transition-all duration-500' />
    </div>
  )
}

export default ProjectCard