import React from 'react'
import Header from '../components/Header.js'
import SpecialityMenu from '../components/SpecialityMenu.js'
import TopDoctors from '../components/TopDoctors.js'
import Banner from '../components/Banner.js'

const Home: React.FC = () => {
  return (
    <div className='animate-reveal'>
      <Header />
      <SpecialityMenu />
      <TopDoctors />
      <Banner />
    </div>
  )
}

export default Home
