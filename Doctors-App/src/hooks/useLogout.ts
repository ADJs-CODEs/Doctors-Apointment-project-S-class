import { useContext } from "react";
import { AppContext } from "@/Context/AppContext";
import { useNavigate } from "@/lib/navigation";
import { disablePush } from "@/utils/push";
import { clearCachedSettings } from "@/hooks/useUserSettings";
import { basket } from "@/utils/basket";
import type { AppContextType } from "@/types";

/** Logs the patient out on this device: stops its push first (that needs the token), clears caches. */
export function useLogout() {
  const { setToken } = useContext(AppContext) as AppContextType;
  const navigate = useNavigate();
  return async () => {
    await disablePush().catch(() => {});
    clearCachedSettings();
    basket.clear();
    setToken("");
    localStorage.removeItem("token");
    navigate("/login");
  };
}
