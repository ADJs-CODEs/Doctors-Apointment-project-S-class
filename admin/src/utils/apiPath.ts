export const BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

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
    MARK_NO_SHOW: "/api/doctor/mark-no-show",
    VIDEO_JOIN: (appointmentId: string) => `/api/doctor/video/${appointmentId}/join`,
    SCHEDULE: "/api/doctor/schedule",
  },
  ADMIN: {
    GET_ALL_DOCTORS: "/api/admin/all-doctors",
    CHANGE_AVAILABILITY: "/api/admin/change-availability",
    GET_ALL_APPOINTMENT: "/api/admin/appointments",
    GET_DASH_DATA: "/api/admin/dashboard",
    CANCEL_APPOINTMENT: "/api/admin/cancel-appointment",
    DELETE_DOCTOR: "/api/admin/delete-doctor",
    ADD_DOCTORS: "/api/admin/add-doctor",
    MARK_MISSED: "/api/admin/mark-missed",
    FINANCE: "/api/admin/finance",
    PAYOUTS: "/api/admin/payouts",
    PAYOUT_PAID: (id: string) => `/api/admin/payouts/${id}/paid`,
    PAYOUT_REJECT: (id: string) => `/api/admin/payouts/${id}/reject`,
    PAYOUT_SEND: (id: string) => `/api/admin/payouts/${id}/send`,
    PAYOUT_REFRESH: (id: string) => `/api/admin/payouts/${id}/refresh`,
  },
  WISH_WELL: {
    ALL: "/api/wish-well/all",
    NOMINATE: "/api/wish-well/nominate",
    UPDATE_STATUS: "/api/wish-well/update-status",
    REMOVE: "/api/wish-well/remove",
  },
  CHAT: {
    DOCTOR_MESSAGE: "/api/chat/doctor-message",
  },
  NOTIFICATIONS: {
    LIST: "/api/doctor/notifications",
    MARK_ALL_READ: "/api/doctor/notifications/mark-all-read",
    MARK_ONE_READ: "/api/doctor/notifications/mark-one-read",
    CLEAR: "/api/doctor/notifications/clear",
  },
  MESSAGES: {
    CONVERSATIONS: "/api/doctor/messages",
    UNREAD: "/api/doctor/messages/unread",
    THREAD: (patientId: string) => `/api/doctor/messages/${patientId}`,
    READ: (patientId: string) => `/api/doctor/messages/${patientId}/read`,
  },
};
