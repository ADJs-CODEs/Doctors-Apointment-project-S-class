export const BASE_URL = import.meta.env.VITE_BACKEND_URL; // || "http://localhost:4000"

export const API_PATHS = {
  AUTH: {
    LOGIN: "/api/user/login",
    REGISTER: "/api/user/register",
    LOAD_USER_PROFILE_DATA: "/api/user/get-profile",
    HANDLE_CHANGE_PASSWORD: "/api/user/change-password",
    HANDLE_DELETE_ACCOUNT: "/api/user/delete-account",
    FORGOT_PASSWORD: "/api/user/forgot-password",
    GOOGLE_AUTH: "/api/user/google-auth",
    STRIPE_AUTH: "/api/user/payment-stripe",
    RESET_PASSWORD: "/api/user/reset-password",
    VERIFY_STRIPE: "/api/user/verify-stripe",
  },

  USER: {
    GET_DOCTORS_DATA: "/api/doctor/list",
    UPDATE_DOSE: "/api/user/update-dose",
    BOOK_APPOINTMENT: "/api/user/book-appointment",
    FETCH_APPOINTMENT: "/api/user/appointments",
    GET_USER_APPOINTMENT: "/api/user/appointments",
    CANCEL_APPOINTMENT: "/api/user/cancel-appointment",
    LOG_DOSE: "/api/user/update-dose",
    UPDATE_USER_PROFILE_DATA: "/api/user/update-profile",
  },
  CHAT: {
    MESSAGE: "/api/chat/message",
  },
  CONNECTIONS: {
    REQUEST: "/api/connections/request",
    RESPOND: "/api/connections/respond",
    MY_REQUESTS: "/api/connections/my-requests",
    WATCHING_OVER: "/api/connections/watching-over",
    MY_WATCHERS: "/api/connections/my-watchers",
    REMOVE: "/api/connections/remove",
    PATIENT_DATA: (patientId: string) =>
      `/api/connections/patient/${patientId}`,
  },
  NOTIFICATIONS: {
    CREATE: "/api/notifications/create",
    GET: "/api/notifications/get",
    MARK_ALL_READ: "/api/notifications/mark-all-read",
    MARK_ONE_READ: "/api/notifications/mark-one-read",
    CLEAR: "/api/notifications/clear",
  },
  WISH_WELL: {
    ALL: "/api/wish-well/all",
    SEND_EMOJI: "/api/wish-well/send-emoji",
    OPT_OUT: "/api/wish-well/opt-out",
  },
};
