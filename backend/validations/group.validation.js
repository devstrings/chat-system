// groupValidation.js - All validation logic

export const validateCreateGroup = (name, memberIds) => {
  if (!name || !name.trim()) {
    return {
      isValid: false,
      message: "Group name is required"
    };
  }

  if (!memberIds || memberIds.length === 0) {
    return {
      isValid: false,
      message: "At least one member required"
    };
  }

  return { isValid: true };
};

export const validateUpdateGroupImage = (file) => {
  if (!file) {
    return {
      isValid: false,
      message: "No image file provided"
    };
  }

  return { isValid: true };
};

export const validateAddMembers = (memberIds) => {
  if (!memberIds || memberIds.length === 0) {
    return {
      isValid: false,
      message: "Member IDs are required"
    };
  }

  return { isValid: true };
};

export const validateGroupExists = (group) => {
  if (!group) {
    return {
      isValid: false,
      statusCode: 404,
      message: "Group not found"
    };
  }

  return { isValid: true };
};

export const validateIsAdmin = (group, userId) => {
  const isAdmin = group.admins.some((a) => a.toString() === userId);
  
  if (!isAdmin) {
    return {
      isValid: false,
      statusCode: 403,
      message: "Only admins can perform this action"
    };
  }

  return { isValid: true };
};

export const validateIsMember = (group, userId) => {
  const isMember = group.members.some((m) => m._id ? m._id.toString() === userId : m.toString() === userId);
  
  if (!isMember) {
    return {
      isValid: false,
      statusCode: 403,
      message: "Not a member"
    };
  }

  return { isValid: true };
};

export const validateIsCreator = (group, userId) => {
  if (group.creator.toString() !== userId) {
    return {
      isValid: false,
      statusCode: 403,
      message: "Only creator can perform this action"
    };
  }

  return { isValid: true };
};

export const validateCannotRemoveCreator = (group, memberId) => {
  if (group.creator.toString() === memberId) {
    return {
      isValid: false,
      statusCode: 403,
      message: "Cannot remove group creator"
    };
  }

  return { isValid: true };
};

export const validateCannotDemoteCreator = (group, memberId) => {
  if (group.creator.toString() === memberId) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Cannot demote group creator"
    };
  }

  return { isValid: true };
};

export const validateIsMemberOfGroup = (group, memberId) => {
  //  Handle both populated and unpopulated members
  const isMember = group.members.some((m) => {
    const mId = m._id ? m._id.toString() : m.toString();
    return mId === memberId;
  });
  
  if (!isMember) {
    return {
      isValid: false,
      statusCode: 400,
      message: "User is not a member"
    };
  }

  return { isValid: true };
};

export const validateIsNotAlreadyAdmin = (group, memberId) => {
  if (group.admins.some((a) => a.toString() === memberId)) {
    return {
      isValid: false,
      statusCode: 400,
      message: "User is already an admin"
    };
  }

  return { isValid: true };
};

export const validateIsActuallyAdmin = (group, memberId) => {
  if (!group.admins.some((a) => a.toString() === memberId)) {
    return {
      isValid: false,
      statusCode: 400,
      message: "User is not an admin"
    };
  }

  return { isValid: true };
};

export const validateFilename = (filename) => {
  // Prevent path traversal attacks
  if (
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return {
      isValid: false,
      message: "Invalid filename"
    };
  }

  return { isValid: true };
};

export const validatePinLimit = (userPinnedCount) => {
  if (userPinnedCount >= 3) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Maximum 3 groups can be pinned"
    };
  }

  return { isValid: true };
};

export const validateNotAlreadyPinned = (group, userId) => {
  const alreadyPinned = group.pinnedBy.some(
    (p) => p.userId.toString() === userId
  );
  
  if (alreadyPinned) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Already pinned"
    };
  }

  return { isValid: true };
};

export const validateNotAlreadyArchived = (group, userId) => {
  const alreadyArchived = group.archivedBy.some(
    (a) => a.userId.toString() === userId
  );
  
  if (alreadyArchived) {
    return {
      isValid: false,
      statusCode: 400,
      message: "Already archived"
    };
  }

  return { isValid: true };
};