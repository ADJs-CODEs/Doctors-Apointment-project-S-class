const appointment_img = '/assets/appointment_img.png'
const header_img = '/assets/header_img.png'
const group_profiles = '/assets/group_profiles.png'
const profile_pic = '/assets/profile_pic.png'
const contact_image = '/assets/contact_image.png'
const about_image = '/assets/about_image.png'
const logo = '/assets/logos.png'
const dropdown_icon = '/assets/dropdown_icon.svg'
const menu_icon = '/assets/menu_icon.svg'
const cross_icon = '/assets/cross_icon.png'
const chats_icon = '/assets/chats_icon.svg'
const verified_icon = '/assets/verified_icon.svg'
const arrow_icon = '/assets/arrow_icon.svg'
const info_icon = '/assets/info_icon.svg'
const upload_icon = '/assets/upload_icon.png'
const stripe_logo = '/assets/stripe_logo.png'
const razorpay_logo = '/assets/razorpay_logo.png'
const doc1 = '/assets/doc1.png'
const doc2 = '/assets/doc2.png'
const doc3 = '/assets/doc3.png'
const doc4 = '/assets/doc4.png'
const doc5 = '/assets/doc5.png'
const doc6 = '/assets/doc6.png'
const doc7 = '/assets/doc7.png'
const doc8 = '/assets/doc8.png'
const doc9 = '/assets/doc9.png'
const doc10 = '/assets/doc10.png'
const doc11 = '/assets/doc11.png'
const doc12 = '/assets/doc12.png'
const doc13 = '/assets/doc13.png'
const doc14 = '/assets/doc14.png'
const doc15 = '/assets/doc15.png'
const Dermatologist = '/assets/Dermatologist.svg'
const Gastroenterologist = '/assets/Gastroenterologist.svg'
const General_physician = '/assets/General_physician.svg'
const Gynecologist = '/assets/Gynecologist.svg'
const Neurologist = '/assets/Neurologist.svg'
const Pediatricians = '/assets/Pediatricians.svg'



export interface SpecialityItem {
    speciality: string;
    image: string;
}

export const assets = {
    appointment_img,
    header_img,
    group_profiles,
    logo,
    chats_icon,
    verified_icon,
    info_icon,
    profile_pic,
    arrow_icon,
    contact_image,
    about_image,
    menu_icon,
    cross_icon,
    dropdown_icon,
    upload_icon,
    stripe_logo,
    razorpay_logo
}

export const specialityData: SpecialityItem[] = [
    {
        speciality: 'General physician',
        image: General_physician
    },
    {
        speciality: 'Gynecologist',
        image: Gynecologist
    },
    {
        speciality: 'Dermatologist',
        image: Dermatologist
    },
    {
        speciality: 'Pediatricians',
        image: Pediatricians
    },
    {
        speciality: 'Neurologist',
        image: Neurologist
    },
    {
        speciality: 'Gastroenterologist',
        image: Gastroenterologist
    },
]

// Explicitly typing the doctors array using our Doctor interface
// export const doctors: Doctor[] = [
//     {
//         _id: 'doc1',
//         name: 'Dr. Richard James',
//         image: doc1,
//         speciality: 'General physician',
//         degree: 'MBBS',
//         experience: '4 Years',
//         about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
//         fees: 50,
//         address: {
//             line1: '17th Cross, Richmond',
//             line2: 'Circle, Ring Road, London'
//         }
//     },
//     {
//         _id: 'doc2',
//         name: 'Dr. Emily Larson',
//         image: doc2,
//         speciality: 'Gynecologist',
//         degree: 'MBBS',
//         experience: '3 Years',
//         about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
//         fees: 60,
//         address: {
//             line1: '27th Cross, Richmond',
//             line2: 'Circle, Ring Road, London'
//         }
//     },
//     {
//         _id: 'doc3',
//         name: 'Dr. Sarah Patel',
//         image: doc3,
//         speciality: 'Dermatologist',
//         degree: 'MBBS',
//         experience: '1 Years',
//         about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
//         fees: 30,
//         address: {
//             line1: '37th Cross, Richmond',
//             line2: 'Circle, Ring Road, London'
//         }
//     },
//     {
//         _id: 'doc4',
//         name: 'Dr. Christopher Lee',
//         image: doc4,
//         speciality: 'Pediatricians',
//         degree: 'MBBS',
//         experience: '2 Years',
//         about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
//         fees: 40,
//         address: {
//             line1: '47th Cross, Richmond',
//             line2: 'Circle, Ring Road, London'
//         }
//     },
//     {
//         _id: 'doc5',
//         name: 'Dr. Jennifer Garcia',
//         image: doc5,
//         speciality: 'Neurologist',
//         degree: 'MBBS',
//         experience: '4 Years',
//         about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
//         fees: 50,
//         address: {
//             line1: '57th Cross, Richmond',
//             line2: 'Circle, Ring Road, London'
//         }
//     },
//     {
//         _id: 'doc6',
//         name: 'Dr. Andrew Williams',
//         image: doc6,
//         speciality: 'Neurologist',
//         degree: 'MBBS',
//         experience: '4 Years',
//         about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
//         fees: 50,
//         address: {
//             line1: '57th Cross, Richmond',
//             line2: 'Circle, Ring Road, London'
//         }
//     },
//     {
//         _id: 'doc7',
//         name: 'Dr. Christopher Davis',
//         image: doc7,
//         speciality: 'General physician',
//         degree: 'MBBS',
//         experience: '4 Years',
//         about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
//         fees: 50,
//         address: {
//             line1: '17th Cross, Richmond',
//             line2: 'Circle, Ring Road, London'
//         }
//     },
//     {
//         _id: 'doc8',
//         name: 'Dr. Timothy White',
//         image: doc8,
//         speciality: 'Gynecologist',
//         degree: 'MBBS',
//         experience: '3 Years',
//         about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
//         fees: 60,
//         address: {
//             line1: '27th Cross, Richmond',
//             line2: 'Circle, Ring Road, London'
//         }
//     },
//     {
//         _id: 'doc9',
//         name: 'Dr. Ava Mitchell',
//         image: doc9,
//         speciality: 'Dermatologist',
//         degree: 'MBBS',
//         experience: '1 Years',
//         about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
//         fees: 30,
//         address: {
//             line1: '37th Cross, Richmond',
//             line2: 'Circle, Ring Road, London'
//         }
//     },
//     {
//         _id: 'doc10',
//         name: 'Dr. Jeffrey King',
//         image: doc10,
//         speciality: 'Pediatricians',
//         degree: 'MBBS',
//         experience: '2 Years',
//         about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
//         fees: 40,
//         address: {
//             line1: '47th Cross, Richmond',
//             line2: 'Circle, Ring Road, London'
//         }
//     },
//     {
//         _id: 'doc11',
//         name: 'Dr. Zoe Kelly',
//         image: doc11,
//         speciality: 'Neurologist',
//         degree: 'MBBS',
//         experience: '4 Years',
//         about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
//         fees: 50,
//         address: {
//             line1: '57th Cross, Richmond',
//             line2: 'Circle, Ring Road, London'
//         }
//     },
//     {
//         _id: 'doc12',
//         name: 'Dr. Patrick Harris',
//         image: doc12,
//         speciality: 'Neurologist',
//         degree: 'MBBS',
//         experience: '4 Years',
//         about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
//         fees: 50,
//         address: {
//             line1: '57th Cross, Richmond',
//             line2: 'Circle, Ring Road, London'
//         }
//     },
//     {
//         _id: 'doc13',
//         name: 'Dr. Chloe Evans',
//         image: doc13,
//         speciality: 'General physician',
//         degree: 'MBBS',
//         experience: '4 Years',
//         about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
//         fees: 50,
//         address: {
//             line1: '17th Cross, Richmond',
//             line2: 'Circle, Ring Road, London'
//         }
//     },
//     {
//         _id: 'doc14',
//         name: 'Dr. Ryan Martinez',
//         image: doc14,
//         speciality: 'Gynecologist',
//         degree: 'MBBS',
//         experience: '3 Years',
//         about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
//         fees: 60,
//         address: {
//             line1: '27th Cross, Richmond',
//             line2: 'Circle, Ring Road, London'
//         }
//     },
//     {
//         _id: 'doc15',
//         name: 'Dr. Amelia Hill',
//         image: doc15,
//         speciality: 'Dermatologist',
//         degree: 'MBBS',
//         experience: '1 Years',
//         about: 'Dr. Davis has a strong commitment to delivering comprehensive medical care, focusing on preventive medicine, early diagnosis, and effective treatment strategies.',
//         fees: 30,
//         address: {
//             line1: '37th Cross, Richmond',
//             line2: 'Circle, Ring Road, London'
//         }
//     },
// ]