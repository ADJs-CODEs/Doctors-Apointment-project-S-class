import React from 'react'
import Header from '../components/Header.js'
import SpecialityMenu from '../components/SpecialityMenu.js'
import TopDoctors from '../components/TopDoctors.js'
import Banner from '../components/Banner.js'

const Home: React.FC = () => {
  return (
    // Adjusted space-y to scale from mobile (12) to desktop (24) for better flow
    <div className='animate-reveal space-y-12 md:space-y-24 mb-10 md:mb-20 overflow-hidden'>

      {/* Hero Header Section */}
      <Header />

      {/* Main Content Wrapper - Responsive Horizontal Padding */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>

        {/* Speciality Selection Grid/Menu */}
        <SpecialityMenu />

        {/* Featured Medical Professionals */}
        <div className='mt-16 md:mt-24'>
          <TopDoctors />
        </div>

      </div>

      {/* Promotional / Action Banner */}
      <Banner />

    </div>
  )
}

export default Home