import express, { Router } from "express";
import { sendConnectionRequest, respondToRequest, getMyRequests, getWatchingOver, getMyWatchers, removeConnection, getPatientData, } from "../controllers/connectionController.js";
import authUser from "../middlewares/authUser.js";
const connectionRouter = express.Router();
connectionRouter.post("/request", authUser, sendConnectionRequest);
connectionRouter.post("/respond", authUser, respondToRequest);
connectionRouter.get("/my-requests", authUser, getMyRequests);
connectionRouter.get("/watching-over", authUser, getWatchingOver);
connectionRouter.get("/my-watchers", authUser, getMyWatchers);
connectionRouter.post("/remove", authUser, removeConnection);
connectionRouter.get("/patient/:patientId", authUser, getPatientData);
export default connectionRouter;
//# sourceMappingURL=connectionRoute.js.map