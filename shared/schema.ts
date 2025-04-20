import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(new Date()),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Image schema
export const images = sqliteTable("images", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  path: text("path").notNull(),
  description: text("description"),
  uploadedAt: integer("uploaded_at", { mode: 'timestamp' }).notNull().default(new Date()),
});

export const insertImageSchema = createInsertSchema(images).pick({
  userId: true,
  path: true,
  description: true,
});

// Friends schema
export const friends = sqliteTable("friends", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  requesterId: integer("requester_id").notNull().references(() => users.id),
  addresseeId: integer("addressee_id").notNull().references(() => users.id),
  status: text("status", { enum: ["pending", "accepted", "declined"] }).notNull().default("pending"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(new Date()),
});

export const insertFriendSchema = createInsertSchema(friends).pick({
  requesterId: true,
  addresseeId: true,
});

// Group schema
export const groups = sqliteTable("groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(new Date()),
});

export const insertGroupSchema = createInsertSchema(groups).pick({
  name: true,
  description: true,
  createdBy: true,
});

// Group members schema
export const groupMembers = sqliteTable("group_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  groupId: integer("group_id").notNull().references(() => groups.id),
  userId: integer("user_id").notNull().references(() => users.id),
  joinedAt: integer("joined_at", { mode: 'timestamp' }).notNull().default(new Date()),
});

export const insertGroupMemberSchema = createInsertSchema(groupMembers).pick({
  groupId: true,
  userId: true,
});

// Image shares schema
export const imageShares = sqliteTable("image_shares", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  imageId: integer("image_id").notNull().references(() => images.id),
  userId: integer("user_id").references(() => users.id),
  groupId: integer("group_id").references(() => groups.id),
  sharedAt: integer("shared_at", { mode: 'timestamp' }).notNull().default(new Date()),
});

export const insertImageShareSchema = createInsertSchema(imageShares).pick({
  imageId: true,
  userId: true,
  groupId: true,
});

// Notifications schema
export const notifications = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type", { enum: ["friend_request", "group_invite", "image_share"] }).notNull(),
  content: text("content").notNull(),
  senderId: integer("sender_id").references(() => users.id),
  groupId: integer("group_id").references(() => groups.id),
  imageId: integer("image_id").references(() => images.id),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(new Date()),
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
