import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import multer from "multer";
import fs from "fs";
import path from "path";
import { 
  insertImageSchema, 
  insertFriendSchema,
  insertGroupSchema,
  insertGroupMemberSchema,
  insertImageShareSchema,
  insertNotificationSchema
} from "@shared/schema";

// Create uploads directory if it doesn't exist
const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

const upload = multer({ 
  storage: storage_config,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/jpg", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, and GIF are allowed."));
    }
  }
});

// Auth middleware
function isAuthenticated(req: Request, res: Response, next: () => void) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Serve uploaded images
  app.use("/uploads", express.static(uploadsDir));

  // Images API
  app.post("/api/images", isAuthenticated, upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }
      
      const userId = req.user!.id;
      const { description } = req.body;
      
      const image = await storage.createImage({
        userId,
        path: `/uploads/${req.file.filename}`,
        description: description || "",
      });
      
      // Handle sharing with users and groups if provided
      if (req.body.userIds || req.body.groupIds) {
        const userIds = req.body.userIds ? JSON.parse(req.body.userIds) : [];
        const groupIds = req.body.groupIds ? JSON.parse(req.body.groupIds) : [];
        
        // Share with users
        for (const userId of userIds) {
          await storage.shareImage({
            imageId: image.id,
            userId: parseInt(userId),
            groupId: null,
          });
          
          // Create notification
          await storage.createNotification({
            userId: parseInt(userId),
            type: "image_share",
            content: `${req.user!.username} shared an image with you`,
            senderId: req.user!.id,
            imageId: image.id,
            groupId: null,
          });
        }
        
        // Share with groups
        for (const groupId of groupIds) {
          await storage.shareImage({
            imageId: image.id,
            userId: null,
            groupId: parseInt(groupId),
          });
          
          // Get group members and notify them
          const members = await storage.getGroupMembers(parseInt(groupId));
          const group = await storage.getGroup(parseInt(groupId));
          
          for (const member of members) {
            if (member.id !== userId) {
              await storage.createNotification({
                userId: member.id,
                type: "image_share",
                content: `${req.user!.username} shared an image in ${group.name}`,
                senderId: req.user!.id,
                imageId: image.id,
                groupId: parseInt(groupId),
              });
            }
          }
        }
      }
      
      res.status(201).json(image);
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Get all images for the current user
  app.get("/api/images", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const images = await storage.getUserImages(userId);
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  // Get images by date
  app.get("/api/images/by-date", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { year, month } = req.query;
      
      let images;
      if (year && month) {
        images = await storage.getUserImagesByDate(
          userId, 
          parseInt(year as string), 
          parseInt(month as string)
        );
      } else {
        images = await storage.getUserImages(userId);
      }
      
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  // Get image dates for timeline
  app.get("/api/images/dates", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const dates = await storage.getUserImageDates(userId);
      res.json(dates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch image dates" });
    }
  });

  // Get a specific image with its shares
  app.get("/api/images/:id", isAuthenticated, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const image = await storage.getImage(imageId);
      
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      // Check if user owns the image or has access to it
      if (image.userId !== userId) {
        const hasAccess = await storage.userHasImageAccess(userId, imageId);
        if (!hasAccess) {
          return res.status(403).json({ message: "You don't have access to this image" });
        }
      }
      
      const imageWithShares = await storage.getImageWithShares(imageId);
      res.json(imageWithShares);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch image" });
    }
  });

  // Delete an image
  app.delete("/api/images/:id", isAuthenticated, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const image = await storage.getImage(imageId);
      
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }
      
      if (image.userId !== userId) {
        return res.status(403).json({ message: "You can only delete your own images" });
      }
      
      // Remove the file from disk
      const filePath = path.join(process.cwd(), image.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      await storage.deleteImage(imageId);
      res.json({ message: "Image deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete image" });
    }
  });

  // Friends API
  
  // Get friends list
  app.get("/api/friends", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const friends = await storage.getUserFriends(userId);
      res.json(friends);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch friends" });
    }
  });

  // Get friend requests
  app.get("/api/friends/requests", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const requests = await storage.getFriendRequests(userId);
      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch friend requests" });
    }
  });

  // Send friend request
  app.post("/api/friends/request", isAuthenticated, async (req, res) => {
    try {
      const requesterId = req.user!.id;
      const { addresseeId } = req.body;
      
      if (requesterId === parseInt(addresseeId)) {
        return res.status(400).json({ message: "You cannot send a friend request to yourself" });
      }
      
      const existingFriend = await storage.getFriendship(requesterId, parseInt(addresseeId));
      
      if (existingFriend) {
        return res.status(400).json({ message: "Friend request already exists" });
      }
      
      const friend = await storage.createFriend({
        requesterId,
        addresseeId: parseInt(addresseeId),
      });
      
      // Create a notification for the addressee
      await storage.createNotification({
        userId: parseInt(addresseeId),
        type: "friend_request",
        content: `${req.user!.username} sent you a friend request`,
        senderId: requesterId,
        groupId: null,
        imageId: null,
      });
      
      res.status(201).json(friend);
    } catch (error) {
      res.status(500).json({ message: "Failed to send friend request" });
    }
  });

  // Respond to friend request
  app.put("/api/friends/requests/:id", isAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (status !== "accepted" && status !== "declined") {
        return res.status(400).json({ message: "Invalid status. Must be 'accepted' or 'declined'" });
      }
      
      const request = await storage.getFriendRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ message: "Friend request not found" });
      }
      
      if (request.addresseeId !== req.user!.id) {
        return res.status(403).json({ message: "You can only respond to your own friend requests" });
      }
      
      const updatedRequest = await storage.updateFriendRequest(requestId, status);
      
      // Create a notification for the requester
      await storage.createNotification({
        userId: request.requesterId,
        type: "friend_request",
        content: status === "accepted" 
          ? `${req.user!.username} accepted your friend request`
          : `${req.user!.username} declined your friend request`,
        senderId: req.user!.id,
        groupId: null,
        imageId: null,
      });
      
      res.json(updatedRequest);
    } catch (error) {
      res.status(500).json({ message: "Failed to respond to friend request" });
    }
  });

  // Search users
  app.get("/api/users/search", isAuthenticated, async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query || typeof query !== "string") {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const users = await storage.searchUsers(query, req.user!.id);
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Groups API
  
  // Get user's groups
  app.get("/api/groups", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const groups = await storage.getUserGroups(userId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch groups" });
    }
  });

  // Create a new group
  app.post("/api/groups", isAuthenticated, async (req, res) => {
    try {
      const { name, description } = req.body;
      const createdBy = req.user!.id;
      
      const group = await storage.createGroup({
        name,
        description,
        createdBy,
      });
      
      // Add the creator as a member
      await storage.addGroupMember({
        groupId: group.id,
        userId: createdBy,
      });
      
      res.status(201).json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  // Get a specific group with members
  app.get("/api/groups/:id", isAuthenticated, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Check if user is a member of the group
      const isMember = await storage.isGroupMember(groupId, userId);
      
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }
      
      const group = await storage.getGroupWithMembers(groupId);
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      res.json(group);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch group" });
    }
  });

  // Add a member to a group
  app.post("/api/groups/:id/members", isAuthenticated, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { userId } = req.body;
      const currentUserId = req.user!.id;
      
      // Check if current user is a member of the group
      const isMember = await storage.isGroupMember(groupId, currentUserId);
      
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }
      
      // Check if user is already a member
      const isAlreadyMember = await storage.isGroupMember(groupId, parseInt(userId));
      
      if (isAlreadyMember) {
        return res.status(400).json({ message: "User is already a member of this group" });
      }
      
      // Add user to group
      await storage.addGroupMember({
        groupId,
        userId: parseInt(userId),
      });
      
      // Create a notification for the invited user
      const group = await storage.getGroup(groupId);
      
      await storage.createNotification({
        userId: parseInt(userId),
        type: "group_invite",
        content: `${req.user!.username} added you to the group "${group.name}"`,
        senderId: currentUserId,
        groupId,
        imageId: null,
      });
      
      res.status(201).json({ message: "User added to group" });
    } catch (error) {
      res.status(500).json({ message: "Failed to add member to group" });
    }
  });

  // Get group images
  app.get("/api/groups/:id/images", isAuthenticated, async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Check if user is a member of the group
      const isMember = await storage.isGroupMember(groupId, userId);
      
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this group" });
      }
      
      const images = await storage.getGroupImages(groupId);
      res.json(images);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch group images" });
    }
  });

  // Remove a member from a group
  app.delete("/api/groups/:groupId/members/:userId", isAuthenticated, async (req, res) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const memberIdToRemove = parseInt(req.params.userId);
      const currentUserId = req.user!.id;
      
      // Get the group to check if current user is creator
      const group = await storage.getGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }
      
      // Users can remove themselves, or the group creator can remove others
      if (memberIdToRemove !== currentUserId && group.createdBy !== currentUserId) {
        return res.status(403).json({ message: "You don't have permission to remove this member" });
      }
      
      await storage.removeGroupMember(groupId, memberIdToRemove);
      res.json({ message: "Member removed from group" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove member from group" });
    }
  });

  // Notifications API
  
  // Get user notifications
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark a notification as read
  app.put("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      const notification = await storage.getNotification(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.userId !== userId) {
        return res.status(403).json({ message: "You can only mark your own notifications as read" });
      }
      
      const updatedNotification = await storage.markNotificationAsRead(notificationId);
      res.json(updatedNotification);
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.put("/api/notifications/read-all", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      await storage.markAllNotificationsAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notifications as read" });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
