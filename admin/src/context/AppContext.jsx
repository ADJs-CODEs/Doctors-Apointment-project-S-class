import { createContext } from "react"


export const AppContext = createContext()

const AppContextProvider = (props) => {

  const calculateAge = (dob) => {
    const today = new Date()
    const birthDate = new Date(dob)
    const monthDiff = today.getMonth() - birthDate.getMonth()

    let age = today.getFullYear() - birthDate.getFullYear()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age

  }

  const months = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "July", "Aug", "Sept", "Oct", "Nov", "Dec"]

  const slotDateFormat = (slotDate) => {
    if (!slotDate) return ""
    const dateArray = slotDate.split('_')
    return dateArray[0] + " " + months[Number(dateArray[1])] + " " + dateArray[2]
  }

  const currency = '$'
  const value = {
    calculateAge,
    slotDateFormat,
    currency
  }

  return (
    <AppContext.Provider value={value}>
      {
        props.children
      }
    </AppContext.Provider>
  )
}

export default AppContextProvider