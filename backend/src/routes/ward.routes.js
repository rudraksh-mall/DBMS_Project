import express from "express";

import {
  getCities,
  getWards,
  lookupWard,
} from "../controllers/ward.controller.js";

const router = express.Router();

router.get("/cities", getCities);
router.get("/lookup", lookupWard);
router.get("/", getWards);

export default router;
