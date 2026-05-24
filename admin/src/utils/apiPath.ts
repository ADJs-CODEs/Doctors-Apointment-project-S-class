export const BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

export const API_PATHS = {
  AUTH: {
    D_LOGIN: "/api/doctor/login",
    A_LOGIN: "/api/admin/login",
    GET_PROFILE: "/api/doctor/update-profile",
  },

  DOCTOR: {
    SEND_ALERT: "/api/doctor/send-alert",
    GET_APPOINTMENTS: "/api/doctor/appointments",
    CANCEL_APPOINTMENT: "/api/doctor/cancel-appointment",
    DASHBOARD: "/api/doctor/dashboard",
    PROFILE: "/api/doctor/profile",
    UPDATE_PROFILE: "/api/doctor/update-profile",
    COMPLETE_APPOINTMENT: "/api/doctor/complete-appointment",
  },

  ADMIN: {
    GET_ALL_DOCTORS: "/api/admin/all-doctors",
    CHANGE_AVAILABILITY: "/api/admin/change-availability",
    GET_ALL_APPOINTMENT: "/api/admin/appointments",
    GET_DASH_DATA: "/api/admin/dashboard",
    CANCEL_APPOINTMENT: "/api/admin/cancel-appointment",
    DELETE_DOCTOR: "/api/admin/delete-doctor",
    ADD_DOCTORS: "/api/admin/add-doctor",
  },
  CHAT: {
    DOCTOR_MESSAGE: "/api/chat/doctor-message",
  },
};
