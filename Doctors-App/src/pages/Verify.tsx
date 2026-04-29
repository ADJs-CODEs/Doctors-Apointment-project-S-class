import React, { useContext, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppContext } from '../Context/AppContext.js'
import { toast } from 'sonner'
import type { AppContextType } from '../types/index.js'
import axiosInstance from '../utils/axiosInstance.js'
import { API_PATHS } from '../utils/apiPath.js'

const Verify: React.FC = () => {
  const [searchParams] = useSearchParams()
  const success = searchParams.get("success")
  const appointmentId = searchParams.get("appointmentId")


  const context = useContext(AppContext) as AppContextType
  const { token, setProgress } = context

  const navigate = useNavigate()

  const verifyStripe = async () => {
    try {
      if (success === 'false' || !success) {
        toast.error("Payment cancelled or interrupted.");
        // return user to their list
        navigate("/my-appointments");
        return;
      }

      // Start Progress Bar
      setProgress(40)

      const { data } = await axiosInstance.post(
        API_PATHS.AUTH.VERIFY_STRIPE, { success, appointmentId }
      )

      //Medium Progress Bar
      setProgress(80)

      if (data.success) {
        toast.success(data.message || "Payment Confirmed!")
        navigate("/my-appointments")
      } else {
        toast.error(data.message || "Payment failed")
        navigate("/")
      }
    } catch (error: any) {
      console.log(error)
      toast.error(error.message)
      navigate("/")
    } finally {
      // Finish Progress Bar
      setProgress(100)
    }
  }

  useEffect(() => {
    if (token && appointmentId) {
      verifyStripe()
    }
  }, [token])

  return (
    <div className='min-h-[60vh] flex flex-col items-center justify-center gap-4'>
      <div className="w-16 h-16 border-4 border-gray-300 border-t-primary rounded-full animate-spin"></div>
      <p className='text-gray-500 animate-pulse font-medium'>Securing your appointment...</p>
    </div>
  )
}

export default Verify