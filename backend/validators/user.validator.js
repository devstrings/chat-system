import { body, query } from "express-validator";

// SEARCH QUERY VALIDATION
export const searchQueryValidation = [
  query("q")
    .optional()
    .isString()
    .withMessage("Search query must be a string"),
];

// PROFILE IMAGE URL VALIDATION
export const profileImageUrlValidation = [
  body("profileImage").notEmpty().withMessage("Profile image URL is required"),
];