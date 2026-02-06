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
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: auto delete expired statuses
statusSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

// Query optimization
statusSchema.index({ userId: 1, expiresAt: 1 });

// Virtual: check if expired
statusSchema.virtual("isExpired").get(function () {
  return this.expiresAt < new Date();
});

// Method: check if user can view status
statusSchema.methods.canView = function (viewerUserId) {
  const viewerId = viewerUserId.toString();
  const ownerId = this.userId.toString();

  if (viewerId === ownerId) return true;

  if (this.privacy === "contacts") {
    return !this.hiddenFrom.some((id) => id.toString() === viewerId);
  }

  if (this.privacy === "except") {
    return !this.hiddenFrom.some((id) => id.toString() === viewerId);
  }

  if (this.privacy === "only") {
    return this.sharedWith.some((id) => id.toString() === viewerId);
  }

  return false;
};

// Method: mark status as viewed
statusSchema.methods.markAsViewed = async function (viewerUserId) {
  const alreadyViewed = this.viewedBy.some(
    (view) => view.userId.toString() === viewerUserId.toString()
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
