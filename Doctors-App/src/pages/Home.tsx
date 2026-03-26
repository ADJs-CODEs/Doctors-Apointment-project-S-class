import React from 'react'
import Header from '../components/Header.js'
import SpecialityMenu from '../components/SpecialityMenu.js'
import TopDoctors from '../components/TopDoctors.js'
import Banner from '../components/Banner.js'

const Home: React.FC = () => {
  return (
    <div className='animate-reveal space-y-24 mb-20'>
      <Header />
      <div className='max-w-7xl mx-auto px-6'>
        <SpecialityMenu />
        <TopDoctors />
      </div>
      <Banner />
    </div>
  )
}

export default Home