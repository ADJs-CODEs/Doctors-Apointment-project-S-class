import React, { useEffect, useState, useContext, } from 'react'

import { AppContext } from '../Context/AppContext.js'
import axios from 'axios'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import type { AppContextType } from '../types/index.js'

const Login: React.FC = () => {
  // Use 'as' here to quickly bridge to your AppContextType
  const context = useContext(AppContext) as AppContextType;
  const { backendUrl, token, setToken, setProgress } = context;

  const navigate = useNavigate()

  // Defining strict union for state
  const [state, setState] = useState<'Sign Up' | 'Login'>('Sign Up')

  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [name, setName] = useState<string>('')

  const onSubmitHandler = async (event: React.BaseSyntheticEvent) => {
    event.preventDefault()

    try {
      setProgress(30)
      if (state === 'Sign Up') {
        const { data } = await axios.post(`${backendUrl}/api/user/register`, { name, email, password })
        setProgress(70)
        if (data.success) {
          localStorage.setItem('token', data.token)
          setToken(data.token)
        } else {
          toast.error(data.message)
        }
      } else {
        const { data } = await axios.post(`${backendUrl}/api/user/login`, { email, password })
        setProgress(70)
        if (data.success) {
          localStorage.setItem('token', data.token)
          setToken(data.token)
        } else {
          toast.error(data.message)
        }
      }

    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setProgress(100)
    }
  }

  useEffect(() => {
    if (token) {
      navigate('/')
    }
  }, [token, navigate])

  return (
    <form onSubmit={onSubmitHandler} className='min-h-[80vh] flex items-center'>
      <div className='flex flex-col gap-3 m-auto items-start p-8 min-w-[340px] sm:min-w-96 border text-zinc-600 text-sm shadow-2xl rounded-2xl animate-reveal'>
        <p className='text-2xl font-semibold'>
          {state === 'Sign Up' ? "Create Account" : "Login"}
        </p>
        <p>
          Please {state === 'Sign Up' ? "Sign Up" : "Log in"} to book appointment
        </p>

        {state === 'Sign Up' && (
          <div className='w-full'>
            <p>Full Name</p>
            <input
              className='border border-zinc-300 rounded w-full p-2 mt-1'
              type="text"
              onChange={(e) => setName(e.target.value)}
              value={name}
              required
            />
          </div>
        )}

        <div className='w-full'>
          <p>Email</p>
          <input
            className='border border-zinc-300 rounded w-full p-2 mt-1'
            type="email"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            required
          />
        </div>

        <div className='w-full'>
          <p>Password</p>
          <input
            className='border border-zinc-300 rounded w-full p-2 mt-1'
            type="password"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
            required
          />
        </div>

        <button type='submit' className='bg-primary text-white w-full py-2 rounded-md text-base hover:bg-opacity-90 transition-all'>
          {state === 'Sign Up' ? "Create Account" : "Login"}
        </button>

        {state === 'Sign Up'
          ? <p>Already have an account? <span onClick={() => setState('Login')} className='text-primary underline cursor-pointer'> Login here</span></p>
          : <p>Create a new account? <span onClick={() => setState('Sign Up')} className='text-primary underline cursor-pointer'>click here</span></p>
        }
      </div>
    </form>
  )
}

export default Login