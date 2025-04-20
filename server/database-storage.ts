import { db, sqlite } from './database';
import { users, type User, type InsertUser, images, type Image, type InsertImage, friends, type Friend, type InsertFriend, groups, type Group, type InsertGroup, groupMembers, type GroupMember, type InsertGroupMember, imageShares, type ImageShare, type InsertImageShare, notifications, type Notification, type InsertNotification, type ImageWithShares, type FriendWithUser, type GroupWithMembers, type NotificationWithDetails } from "@shared/schema";
import { eq, and, or, ne, like, desc, inArray, sql } from "drizzle-orm";
import session from "express-session";
import connectSqlite from "connect-sqlite3";

const SQLiteStore = connectSqlite(session);

import { IStorage } from './storage';

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new SQLiteStore({
      db: 'session.db',
      dir: './data',
      table: 'sessions'
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async searchUsers(query: string, currentUserId: number): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(
        and(
          ne(users.id, currentUserId),
          like(users.username, `%${query}%`)
        )
      );
  }

  // Image operations
  async createImage(image: InsertImage): Promise<Image> {
    const result = await db.insert(images).values(image).returning();
    return result[0];
  }

  async getImage(id: number): Promise<Image | undefined> {
    const result = await db.select().from(images).where(eq(images.id, id)).limit(1);
    return result[0];
  }

  async getUserImages(userId: number): Promise<Image[]> {
    return await db.select()
      .from(images)
      .where(eq(images.userId, userId))
      .orderBy(desc(images.uploadedAt));
  }

  async getUserImagesByDate(userId: number, year: number, month: number): Promise<Image[]> {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);
    
    return await db.select()
      .from(images)
      .where(
        and(
          eq(images.userId, userId),
          sql`datetime(${images.uploadedAt} / 1000, 'unixepoch') >= datetime(${monthStart.getTime() / 1000}, 'unixepoch')`,
          sql`datetime(${images.uploadedAt} / 1000, 'unixepoch') <= datetime(${monthEnd.getTime() / 1000}, 'unixepoch')`
        )
      )
      .orderBy(desc(images.uploadedAt));
  }

  async getUserImageDates(userId: number): Promise<{ year: number; month: number }[]> {
    // This query gets distinct year-month combinations for a user's images
    const query = db.select({
      year: sql`strftime('%Y', datetime(${images.uploadedAt} / 1000, 'unixepoch'))`,
      month: sql`strftime('%m', datetime(${images.uploadedAt} / 1000, 'unixepoch'))`
    })
    .from(images)
    .where(eq(images.userId, userId))
    .groupBy(sql`strftime('%Y-%m', datetime(${images.uploadedAt} / 1000, 'unixepoch'))`)
    .orderBy(desc(sql`strftime('%Y-%m', datetime(${images.uploadedAt} / 1000, 'unixepoch'))`));
    
    const results = await query;
    
    return results.map(result => ({
      year: parseInt(result.year),
      month: parseInt(result.month) - 1 // JavaScript months are 0-indexed
    }));
  }

  async getImageWithShares(imageId: number): Promise<ImageWithShares | undefined> {
    const image = await this.getImage(imageId);
    if (!image) return undefined;

    // Get user shares
    const userShares = await db.select({ userId: imageShares.userId })
      .from(imageShares)
      .where(
        and(
          eq(imageShares.imageId, imageId),
          ne(imageShares.userId, null)
        )
      );
    
    const userIds = userShares.map(share => share.userId).filter(Boolean) as number[];
    
    // Get group shares
    const groupShares = await db.select({ groupId: imageShares.groupId })
      .from(imageShares)
      .where(
        and(
          eq(imageShares.imageId, imageId),
          ne(imageShares.groupId, null)
        )
      );
    
    const groupIds = groupShares.map(share => share.groupId).filter(Boolean) as number[];
    
    // Get users and groups data
    const sharedUsers = userIds.length ? await db.select().from(users).where(inArray(users.id, userIds)) : [];
    const sharedGroups = groupIds.length ? await db.select().from(groups).where(inArray(groups.id, groupIds)) : [];
    
    return {
      ...image,
      shares: {
        users: sharedUsers,
        groups: sharedGroups
      }
    };
  }

  async deleteImage(id: number): Promise<void> {
    // Delete shares first (foreign key constraint)
    await db.delete(imageShares).where(eq(imageShares.imageId, id));
    
    // Delete notifications related to this image
    await db.delete(notifications).where(eq(notifications.imageId, id));
    
    // Delete the image
    await db.delete(images).where(eq(images.id, id));
  }

  async userHasImageAccess(userId: number, imageId: number): Promise<boolean> {
    // Check if user is the owner of the image
    const image = await db.select()
      .from(images)
      .where(
        and(
          eq(images.id, imageId),
          eq(images.userId, userId)
        )
      )
      .limit(1);
    
    if (image.length > 0) return true;
    
    // Check if image is shared directly with user
    const directShare = await db.select()
      .from(imageShares)
      .where(
        and(
          eq(imageShares.imageId, imageId),
          eq(imageShares.userId, userId)
        )
      )
      .limit(1);
    
    if (directShare.length > 0) return true;
    
    // Check if image is shared with any group the user is a member of
    const userGroups = await db.select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));
    
    const userGroupIds = userGroups.map(group => group.groupId);
    
    if (userGroupIds.length === 0) return false;
    
    const groupShare = await db.select()
      .from(imageShares)
      .where(
        and(
          eq(imageShares.imageId, imageId),
          inArray(imageShares.groupId, userGroupIds)
        )
      )
      .limit(1);
    
    return groupShare.length > 0;
  }

  // Friend operations
  async createFriend(friend: InsertFriend): Promise<Friend> {
    const result = await db.insert(friends).values({
      ...friend,
      status: "pending"
    }).returning();
    return result[0];
  }

  async getFriendship(requesterId: number, addresseeId: number): Promise<Friend | undefined> {
    const result = await db.select()
      .from(friends)
      .where(
        or(
          and(
            eq(friends.requesterId, requesterId),
            eq(friends.addresseeId, addresseeId)
          ),
          and(
            eq(friends.requesterId, addresseeId),
            eq(friends.addresseeId, requesterId)
          )
        )
      )
      .limit(1);
    
    return result[0];
  }

  async getFriendRequest(id: number): Promise<Friend | undefined> {
    const result = await db.select().from(friends).where(eq(friends.id, id)).limit(1);
    return result[0];
  }

  async getFriendRequests(userId: number): Promise<FriendWithUser[]> {
    const requests = await db.select()
      .from(friends)
      .where(
        and(
          eq(friends.addresseeId, userId),
          eq(friends.status, "pending")
        )
      );
    
    const result = await Promise.all(
      requests.map(async (request) => {
        const user = await this.getUser(request.requesterId);
        return {
          ...request,
          user: user!
        };
      })
    );
    
    return result;
  }

  async getUserFriends(userId: number): Promise<FriendWithUser[]> {
    const friendships = await db.select()
      .from(friends)
      .where(
        and(
          or(
            eq(friends.requesterId, userId),
            eq(friends.addresseeId, userId)
          ),
          eq(friends.status, "accepted")
        )
      );
    
    const result = await Promise.all(
      friendships.map(async (friendship) => {
        const otherUserId = friendship.requesterId === userId
          ? friendship.addresseeId
          : friendship.requesterId;
        
        const user = await this.getUser(otherUserId);
        return {
          ...friendship,
          user: user!
        };
      })
    );
    
    return result;
  }

  async updateFriendRequest(id: number, status: 'accepted' | 'declined'): Promise<Friend> {
    const result = await db.update(friends)
      .set({ status })
      .where(eq(friends.id, id))
      .returning();
    
    return result[0];
  }

  // Group operations
  async createGroup(group: InsertGroup): Promise<Group> {
    const result = await db.insert(groups).values(group).returning();
    return result[0];
  }

  async getGroup(id: number): Promise<Group> {
    const result = await db.select().from(groups).where(eq(groups.id, id)).limit(1);
    if (!result.length) {
      throw new Error("Group not found");
    }
    return result[0];
  }

  async getUserGroups(userId: number): Promise<Group[]> {
    const memberGroups = await db.select({ groupId: groupMembers.groupId })
      .from(groupMembers)
      .where(eq(groupMembers.userId, userId));
    
    const groupIds = memberGroups.map(group => group.groupId);
    
    if (groupIds.length === 0) return [];
    
    return db.select()
      .from(groups)
      .where(inArray(groups.id, groupIds));
  }

  async getGroupWithMembers(id: number): Promise<GroupWithMembers | undefined> {
    const group = await this.getGroup(id).catch(() => undefined);
    if (!group) return undefined;
    
    const members = await this.getGroupMembers(id);
    
    return {
      ...group,
      members
    };
  }

  async addGroupMember(member: InsertGroupMember): Promise<GroupMember> {
    const result = await db.insert(groupMembers).values(member).returning();
    return result[0];
  }

  async getGroupMembers(groupId: number): Promise<User[]> {
    const memberRecords = await db.select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    
    const userIds = memberRecords.map(record => record.userId);
    
    if (userIds.length === 0) return [];
    
    return db.select()
      .from(users)
      .where(inArray(users.id, userIds));
  }

  async isGroupMember(groupId: number, userId: number): Promise<boolean> {
    const result = await db.select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userId)
        )
      )
      .limit(1);
    
    return result.length > 0;
  }

  async removeGroupMember(groupId: number, userId: number): Promise<void> {
    await db.delete(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userId)
        )
      );
  }

  async getGroupImages(groupId: number): Promise<Image[]> {
    const shares = await db.select({ imageId: imageShares.imageId })
      .from(imageShares)
      .where(eq(imageShares.groupId, groupId));
    
    const imageIds = shares.map(share => share.imageId);
    
    if (imageIds.length === 0) return [];
    
    return db.select()
      .from(images)
      .where(inArray(images.id, imageIds))
      .orderBy(desc(images.uploadedAt));
  }

  // Image sharing operations
  async shareImage(share: InsertImageShare): Promise<ImageShare> {
    const result = await db.insert(imageShares).values(share).returning();
    return result[0];
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const result = await db.insert(notifications).values({
      ...notification,
      isRead: false
    }).returning();
    return result[0];
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    const result = await db.select().from(notifications).where(eq(notifications.id, id)).limit(1);
    return result[0];
  }

  async getUserNotifications(userId: number): Promise<NotificationWithDetails[]> {
    const notificationsList = await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
    
    const result = await Promise.all(
      notificationsList.map(async notification => {
        const details: NotificationWithDetails = { ...notification };
        
        if (notification.senderId) {
          details.sender = await this.getUser(notification.senderId);
        }
        
        if (notification.groupId) {
          details.group = await this.getGroup(notification.groupId).catch(() => undefined);
        }
        
        if (notification.imageId) {
          details.image = await this.getImage(notification.imageId);
        }
        
        return details;
      })
    );
    
    return result;
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    const result = await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning();
    
    if (!result.length) {
      throw new Error("Notification not found");
    }
    
    return result[0];
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }
}