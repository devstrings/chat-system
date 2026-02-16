import { body } from "express-validator";

// CREATE STATUS VALIDATION
export const createStatusValidation = [
  body("type")
    .isIn(["image", "video", "text"])
    .withMessage("Invalid status type"),
];