import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.js'
import { BrowserRouter } from 'react-router-dom'
import AppContextProvider from './Context/AppContext.js'

const rootElement = document.getElementById('root')!;

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <AppContextProvider>

        <div className='min-h-screen bg-dark-bg text-slate-200 relative isolate selection:bg-primary/30 selection:text-white'>

          <div className='fixed inset-0 -z-10 overflow-hidden pointer-events-none'>
            {/* Top-Right Electric Pulse */}
            <div className='absolute -top-[10%] -right-[5%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[140px] animate-pulse' style={{ animationDuration: '8s' }} />

            {/* Bottom-Left Cyan Glow */}
            <div className='absolute bottom-[5%] -left-[10%] w-[40%] h-[40%] bg-electric-cyan/15 rounded-full blur-[120px] animate-pulse' style={{ animationDuration: '12s' }} />

            {/* Center Depth Softener */}
            <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-primary/5 rounded-full blur-[160px]' />
          </div>

          {/* --- Main App Content --- */}
          <App />

        </div>
      </AppContextProvider>
    </BrowserRouter>
  </StrictMode>
)