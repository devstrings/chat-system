import mongoose from "mongoose";

const statusSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["image", "video", "text"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      maxlength: 200,
      default: "",
    },
    backgroundColor: {
      type: String,
      default: "#1E3A8A",
    },
    textColor: {
      type: String,
      default: "#FFFFFF",
    },
    font: {
      type: String,
      default: "sans-serif",
    },
    privacy: {
      type: String,
      enum: ["contacts", "except", "only"],
      default: "contacts",
    },
    hiddenFrom: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    sharedWith: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    viewedBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    duration: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  },
);

// Index for faster queries
statusSchema.index({ userId: 1, expiresAt: 1 });
statusSchema.index({ expiresAt: 1 });

// Virtual for checking if expired
statusSchema.virtual("isExpired").get(function () {
  return this.expiresAt < new Date();
});

// Method to check if user can view this status
statusSchema.methods.canView = function (viewerUserId) {
  const viewerId = viewerUserId.toString();
  const ownerId = this.userId.toString();

  // Owner can always view
  if (viewerId === ownerId) return true;

  // Check privacy settings
  if (this.privacy === "contacts") {
    // All contacts can view except hidden
    return !this.hiddenFrom.some((id) => id.toString() === viewerId);
  } else if (this.privacy === "except") {
    // All contacts except specified
    return !this.hiddenFrom.some((id) => id.toString() === viewerId);
  } else if (this.privacy === "only") {
    // Only specified users
    return this.sharedWith.some((id) => id.toString() === viewerId);
  }

  return false;
};

// Method to mark as viewed
statusSchema.methods.markAsViewed = async function (viewerUserId) {
  const alreadyViewed = this.viewedBy.some(
    (view) => view.userId.toString() === viewerUserId.toString(),
  );

  if (!alreadyViewed) {
    this.viewedBy.push({
      userId: viewerUserId,
      viewedAt: new Date(),
    });
    await this.save();
  }
};

const Status = mongoose.model("Status", statusSchema);

export default Status;
