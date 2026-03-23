import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.js'
import { BrowserRouter } from 'react-router-dom'
import AdminContextProvider from './context/AdminContext.js'
import AppContextProvider from './context/AppContext.js'
import DoctorContextProvider from './context/DoctorContext.js'


const rootElement = document.getElementById('root')!;

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AdminContextProvider>
        <DoctorContextProvider>
          <AppContextProvider>
            <App />
          </AppContextProvider>
        </DoctorContextProvider>
      </AdminContextProvider>
    </BrowserRouter>
  </StrictMode>
)