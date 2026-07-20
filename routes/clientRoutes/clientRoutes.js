import express from "express";
import {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
} from "../../controllers/client/clientController.js";

const router = express.Router();

router.route("/").post(createClient).get(getAllClients)

router
  .route("/:id")
  .get(getClientById) 
  .put(updateClient); 

export default router;
