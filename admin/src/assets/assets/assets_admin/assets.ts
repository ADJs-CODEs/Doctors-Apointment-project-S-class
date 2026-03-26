import add_icon from './add_icon.svg'
import admin_logo from './admin_logos.png'
import appointment_icon from './appointment_icon.svg'
import cancel_icon from './cancel_icon.svg'
import doctor_icon from './doctor_icon.svg'
import home_icon from './home_icon.svg'
import people_icon from './people_icon.svg'
import upload_area from './upload_area.svg'
import list_icon from './list_icon.svg'
import tick_icon from './tick_icon.svg'
import appointments_icon from './appointments_icon.svg'
import earning_icon from './earning_icon.svg'
import patients_icon from './patients_icon.svg'

// Define the shape of the assets object
interface Assets {
    add_icon: string;
    admin_logo: string;
    appointment_icon: string;
    cancel_icon: string;
    doctor_icon: string;
    upload_area: string;
    home_icon: string;
    patients_icon: string;
    people_icon: string;
    list_icon: string;
    tick_icon: string;
    appointments_icon: string;
    earning_icon: string;
}

export const assets: Assets = {
    add_icon,
    admin_logo,
    appointment_icon,
    cancel_icon,
    doctor_icon,
    upload_area,
    home_icon,
    patients_icon,
    people_icon,
    list_icon,
    tick_icon,
    appointments_icon,
    earning_icon
}