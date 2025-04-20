import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Image schema
export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  path: text("path").notNull(),
  description: text("description"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertImageSchema = createInsertSchema(images).pick({
  userId: true,
  path: true,
  description: true,
});

// Friend status enum
export const friendStatusEnum = pgEnum("friend_status", ["pending", "accepted", "declined"]);

// Friends schema
export const friends = pgTable("friends", {
  id: serial("id").primaryKey(),
  requesterId: integer("requester_id").notNull().references(() => users.id),
  addresseeId: integer("addressee_id").notNull().references(() => users.id),
  status: friendStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFriendSchema = createInsertSchema(friends).pick({
  requesterId: true,
  addresseeId: true,
});

// Group schema
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGroupSchema = createInsertSchema(groups).pick({
  name: true,
  description: true,
  createdBy: true,
});

// Group members schema
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).pick({
  groupId: true,
  userId: true,
});

// Image shares schema
export const imageShares = pgTable("image_shares", {
  id: serial("id").primaryKey(),
  imageId: integer("image_id").notNull().references(() => images.id),
  userId: integer("user_id").references(() => users.id),
  groupId: integer("group_id").references(() => groups.id),
  sharedAt: timestamp("shared_at").defaultNow().notNull(),
});

export const insertImageShareSchema = createInsertSchema(imageShares).pick({
  imageId: true,
  userId: true,
  groupId: true,
});

// Notifications schema
export const notificationTypeEnum = pgEnum("notification_type", ["friend_request", "group_invite", "image_share"]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: notificationTypeEnum("type").notNull(),
  content: text("content").notNull(),
  senderId: integer("sender_id").references(() => users.id),
  groupId: integer("group_id").references(() => groups.id),
  imageId: integer("image_id").references(() => images.id),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  content: true,
  senderId: true,
  groupId: true,
  imageId: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Image = typeof images.$inferSelect;
export type InsertImage = z.infer<typeof insertImageSchema>;

export type Friend = typeof friends.$inferSelect;
export type InsertFriend = z.infer<typeof insertFriendSchema>;

export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;

export type GroupMember = typeof groupMembers.$inferSelect;
export type InsertGroupMember = z.infer<typeof insertGroupMemberSchema>;

export type ImageShare = typeof imageShares.$inferSelect;
export type InsertImageShare = z.infer<typeof insertImageShareSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// Extended types for frontend
export type ImageWithShares = Image & {
  shares: {
    users: User[];
    groups: Group[];
  };
};

export type FriendWithUser = Friend & {
  user: User;
};

export type GroupWithMembers = Group & {
  members: User[];
};

export type NotificationWithDetails = Notification & {
  sender?: User;
  group?: Group;
  image?: Image;
};
