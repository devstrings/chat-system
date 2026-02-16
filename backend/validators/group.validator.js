import { body } from "express-validator";

// CREATE GROUP VALIDATION
export const createGroupValidation = [
  body("name").notEmpty().withMessage("Group name is required"),
  body("memberIds")
    .isArray({ min: 1 })
    .withMessage("At least one member is required"),
];

// ADD MEMBERS VALIDATION
export const addMembersValidation = [
  body("memberIds")
    .isArray({ min: 1 })
    .withMessage("Member IDs are required"),
];

// EDIT GROUP MESSAGE VALIDATION
export const editGroupMessageValidation = [
  body("text").notEmpty().withMessage("Message text is required"),
];