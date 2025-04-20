import { type User, type InsertUser, type Image, type InsertImage, type Friend, type InsertFriend, type Group, type InsertGroup, type GroupMember, type InsertGroupMember, type ImageShare, type InsertImageShare, type Notification, type InsertNotification, type ImageWithShares, type FriendWithUser, type GroupWithMembers, type NotificationWithDetails } from "@shared/schema";
import { Store } from "express-session";
import { DatabaseStorage } from './database-storage';

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  searchUsers(query: string, currentUserId: number): Promise<User[]>;
  
  // Image operations
  createImage(image: InsertImage): Promise<Image>;
  getImage(id: number): Promise<Image | undefined>;
  getUserImages(userId: number): Promise<Image[]>;
  getUserImagesByDate(userId: number, year: number, month: number): Promise<Image[]>;
  getUserImageDates(userId: number): Promise<{ year: number; month: number }[]>;
  getImageWithShares(imageId: number): Promise<ImageWithShares | undefined>;
  deleteImage(id: number): Promise<void>;
  userHasImageAccess(userId: number, imageId: number): Promise<boolean>;
  
  // Friend operations
  createFriend(friend: InsertFriend): Promise<Friend>;
  getFriendship(requesterId: number, addresseeId: number): Promise<Friend | undefined>;
  getFriendRequest(id: number): Promise<Friend | undefined>;
  getFriendRequests(userId: number): Promise<FriendWithUser[]>;
  getUserFriends(userId: number): Promise<FriendWithUser[]>;
  updateFriendRequest(id: number, status: 'accepted' | 'declined'): Promise<Friend>;
  
  // Group operations
  createGroup(group: InsertGroup): Promise<Group>;
  getGroup(id: number): Promise<Group>;
  getUserGroups(userId: number): Promise<Group[]>;
  getGroupWithMembers(id: number): Promise<GroupWithMembers | undefined>;
  addGroupMember(member: InsertGroupMember): Promise<GroupMember>;
  getGroupMembers(groupId: number): Promise<User[]>;
  isGroupMember(groupId: number, userId: number): Promise<boolean>;
  removeGroupMember(groupId: number, userId: number): Promise<void>;
  getGroupImages(groupId: number): Promise<Image[]>;
  
  // Image sharing operations
  shareImage(share: InsertImageShare): Promise<ImageShare>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotification(id: number): Promise<Notification | undefined>;
  getUserNotifications(userId: number): Promise<NotificationWithDetails[]>;
  markNotificationAsRead(id: number): Promise<Notification>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  
  // Session store
  sessionStore: Store;
}

export class MemStorage implements IStorage {
  private usersStore: Map<number, User>;
  private imagesStore: Map<number, Image>;
  private friendsStore: Map<number, Friend>;
  private groupsStore: Map<number, Group>;
  private groupMembersStore: Map<number, GroupMember>;
  private imageSharesStore: Map<number, ImageShare>;
  private notificationsStore: Map<number, Notification>;
  
  currentUserId: number;
  currentImageId: number;
  currentFriendId: number;
  currentGroupId: number;
  currentGroupMemberId: number;
  currentImageShareId: number;
  currentNotificationId: number;
  
  sessionStore: Store;

  constructor() {
    this.usersStore = new Map();
    this.imagesStore = new Map();
    this.friendsStore = new Map();
    this.groupsStore = new Map();
    this.groupMembersStore = new Map();
    this.imageSharesStore = new Map();
    this.notificationsStore = new Map();
    
    this.currentUserId = 1;
    this.currentImageId = 1;
    this.currentFriendId = 1;
    this.currentGroupId = 1;
    this.currentGroupMemberId = 1;
    this.currentImageShareId = 1;
    this.currentNotificationId = 1;
    
    // Using a basic memory store for session data
    const createMemoryStore = require('memorystore');
    const MemoryStore = createMemoryStore(require('express-session'));
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.usersStore.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.usersStore.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: new Date() 
    };
    this.usersStore.set(id, user);
    return user;
  }
  
  async searchUsers(query: string, currentUserId: number): Promise<User[]> {
    return Array.from(this.usersStore.values())
      .filter(user => 
        user.id !== currentUserId && 
        user.username.toLowerCase().includes(query.toLowerCase())
      );
  }

  // Image operations
  async createImage(insertImage: InsertImage): Promise<Image> {
    const id = this.currentImageId++;
    const image: Image = {
      ...insertImage,
      id,
      uploadedAt: new Date(),
    };
    this.imagesStore.set(id, image);
    return image;
  }
  
  async getImage(id: number): Promise<Image | undefined> {
    return this.imagesStore.get(id);
  }
  
  async getUserImages(userId: number): Promise<Image[]> {
    return Array.from(this.imagesStore.values())
      .filter(image => image.userId === userId)
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }
  
  async getUserImagesByDate(userId: number, year: number, month: number): Promise<Image[]> {
    return Array.from(this.imagesStore.values())
      .filter(image => {
        const imageDate = image.uploadedAt;
        return (
          image.userId === userId &&
          imageDate.getFullYear() === year &&
          imageDate.getMonth() === month
        );
      })
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }
  
  async getUserImageDates(userId: number): Promise<{ year: number; month: number }[]> {
    const dates = new Set<string>();
    
    Array.from(this.imagesStore.values())
      .filter(image => image.userId === userId)
      .forEach(image => {
        const year = image.uploadedAt.getFullYear();
        const month = image.uploadedAt.getMonth();
        dates.add(`${year}-${month}`);
      });
    
    return Array.from(dates).map(dateStr => {
      const [year, month] = dateStr.split('-').map(Number);
      return { year, month };
    }).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }
  
  async getImageWithShares(imageId: number): Promise<ImageWithShares | undefined> {
    const image = this.imagesStore.get(imageId);
    if (!image) return undefined;
    
    const shares = Array.from(this.imageSharesStore.values())
      .filter(share => share.imageId === imageId);
    
    const userIds = new Set<number>();
    const groupIds = new Set<number>();
    
    shares.forEach(share => {
      if (share.userId) userIds.add(share.userId);
      if (share.groupId) groupIds.add(share.groupId);
    });
    
    const users = Array.from(userIds).map(id => this.usersStore.get(id)!);
    const groupsData = Array.from(groupIds).map(id => this.groupsStore.get(id)!);
    
    return {
      ...image,
      shares: {
        users,
        groups: groupsData,
      },
    };
  }
  
  async deleteImage(id: number): Promise<void> {
    this.imagesStore.delete(id);
    
    // Delete associated shares
    for (const [shareId, share] of this.imageSharesStore.entries()) {
      if (share.imageId === id) {
        this.imageSharesStore.delete(shareId);
      }
    }
    
    // Delete associated notifications
    for (const [notificationId, notification] of this.notificationsStore.entries()) {
      if (notification.imageId === id) {
        this.notificationsStore.delete(notificationId);
      }
    }
  }
  
  async userHasImageAccess(userId: number, imageId: number): Promise<boolean> {
    // Check if the image is shared directly with the user
    const directShare = Array.from(this.imageSharesStore.values())
      .some(share => share.imageId === imageId && share.userId === userId);
    
    if (directShare) return true;
    
    // Check if the image is shared with any group the user is a member of
    const userGroupIds = Array.from(this.groupMembersStore.values())
      .filter(member => member.userId === userId)
      .map(member => member.groupId);
    
    return Array.from(this.imageSharesStore.values())
      .some(share => 
        share.imageId === imageId && 
        share.groupId !== null && 
        userGroupIds.includes(share.groupId)
      );
  }

  // Friend operations
  async createFriend(insertFriend: InsertFriend): Promise<Friend> {
    const id = this.currentFriendId++;
    const friend: Friend = {
      ...insertFriend,
      id,
      status: "pending",
      createdAt: new Date(),
    };
    this.friendsStore.set(id, friend);
    return friend;
  }
  
  async getFriendship(requesterId: number, addresseeId: number): Promise<Friend | undefined> {
    return Array.from(this.friendsStore.values())
      .find(friend => 
        (friend.requesterId === requesterId && friend.addresseeId === addresseeId) ||
        (friend.requesterId === addresseeId && friend.addresseeId === requesterId)
      );
  }
  
  async getFriendRequest(id: number): Promise<Friend | undefined> {
    return this.friendsStore.get(id);
  }
  
  async getFriendRequests(userId: number): Promise<FriendWithUser[]> {
    const requests = Array.from(this.friendsStore.values())
      .filter(friend => 
        friend.addresseeId === userId && 
        friend.status === "pending"
      );
    
    return requests.map(request => {
      const user = this.usersStore.get(request.requesterId)!;
      return {
        ...request,
        user,
      };
    });
  }
  
  async getUserFriends(userId: number): Promise<FriendWithUser[]> {
    const friendships = Array.from(this.friendsStore.values())
      .filter(friend => 
        (friend.requesterId === userId || friend.addresseeId === userId) && 
        friend.status === "accepted"
      );
    
    return friendships.map(friendship => {
      const otherUserId = friendship.requesterId === userId 
        ? friendship.addresseeId 
        : friendship.requesterId;
      
      const user = this.usersStore.get(otherUserId)!;
      
      return {
        ...friendship,
        user,
      };
    });
  }
  
  async updateFriendRequest(id: number, status: 'accepted' | 'declined'): Promise<Friend> {
    const request = this.friendsStore.get(id);
    if (!request) {
      throw new Error("Friend request not found");
    }
    
    const updatedRequest: Friend = {
      ...request,
      status,
    };
    
    this.friendsStore.set(id, updatedRequest);
    return updatedRequest;
  }

  // Group operations
  async createGroup(insertGroup: InsertGroup): Promise<Group> {
    const id = this.currentGroupId++;
    const group: Group = {
      ...insertGroup,
      id,
      createdAt: new Date(),
    };
    this.groupsStore.set(id, group);
    return group;
  }
  
  async getGroup(id: number): Promise<Group> {
    const group = this.groupsStore.get(id);
    if (!group) {
      throw new Error("Group not found");
    }
    return group;
  }
  
  async getUserGroups(userId: number): Promise<Group[]> {
    const userGroupIds = Array.from(this.groupMembersStore.values())
      .filter(member => member.userId === userId)
      .map(member => member.groupId);
    
    return Array.from(this.groupsStore.values())
      .filter(group => userGroupIds.includes(group.id));
  }
  
  async getGroupWithMembers(id: number): Promise<GroupWithMembers | undefined> {
    const group = this.groupsStore.get(id);
    if (!group) return undefined;
    
    const memberRecords = Array.from(this.groupMembersStore.values())
      .filter(member => member.groupId === id);
    
    const members = memberRecords
      .map(member => this.usersStore.get(member.userId)!)
      .filter(Boolean);
    
    return {
      ...group,
      members,
    };
  }
  
  async addGroupMember(insertMember: InsertGroupMember): Promise<GroupMember> {
    const id = this.currentGroupMemberId++;
    const member: GroupMember = {
      ...insertMember,
      id,
      joinedAt: new Date(),
    };
    this.groupMembersStore.set(id, member);
    return member;
  }
  
  async getGroupMembers(groupId: number): Promise<User[]> {
    const memberIds = Array.from(this.groupMembersStore.values())
      .filter(member => member.groupId === groupId)
      .map(member => member.userId);
    
    return memberIds.map(id => this.usersStore.get(id)!).filter(Boolean);
  }
  
  async isGroupMember(groupId: number, userId: number): Promise<boolean> {
    return Array.from(this.groupMembersStore.values())
      .some(member => member.groupId === groupId && member.userId === userId);
  }
  
  async removeGroupMember(groupId: number, userId: number): Promise<void> {
    for (const [id, member] of this.groupMembersStore.entries()) {
      if (member.groupId === groupId && member.userId === userId) {
        this.groupMembersStore.delete(id);
        return;
      }
    }
  }
  
  async getGroupImages(groupId: number): Promise<Image[]> {
    const imageIds = Array.from(this.imageSharesStore.values())
      .filter(share => share.groupId === groupId)
      .map(share => share.imageId);
    
    return Array.from(this.imagesStore.values())
      .filter(image => imageIds.includes(image.id))
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
  }

  // Image sharing operations
  async shareImage(insertShare: InsertImageShare): Promise<ImageShare> {
    const id = this.currentImageShareId++;
    const share: ImageShare = {
      ...insertShare,
      id,
      sharedAt: new Date(),
    };
    this.imageSharesStore.set(id, share);
    return share;
  }

  // Notification operations
  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = this.currentNotificationId++;
    const notification: Notification = {
      ...insertNotification,
      id,
      isRead: false,
      createdAt: new Date(),
    };
    this.notificationsStore.set(id, notification);
    return notification;
  }
  
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notificationsStore.get(id);
  }
  
  async getUserNotifications(userId: number): Promise<NotificationWithDetails[]> {
    const notifications = Array.from(this.notificationsStore.values())
      .filter(notification => notification.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return notifications.map(notification => {
      const result: NotificationWithDetails = { ...notification };
      
      if (notification.senderId) {
        result.sender = this.usersStore.get(notification.senderId);
      }
      
      if (notification.groupId) {
        result.group = this.groupsStore.get(notification.groupId);
      }
      
      if (notification.imageId) {
        result.image = this.imagesStore.get(notification.imageId);
      }
      
      return result;
    });
  }
  
  async markNotificationAsRead(id: number): Promise<Notification> {
    const notification = this.notificationsStore.get(id);
    if (!notification) {
      throw new Error("Notification not found");
    }
    
    const updatedNotification: Notification = {
      ...notification,
      isRead: true,
    };
    
    this.notificationsStore.set(id, updatedNotification);
    return updatedNotification;
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<void> {
    for (const [id, notification] of this.notificationsStore.entries()) {
      if (notification.userId === userId && !notification.isRead) {
        this.notificationsStore.set(id, { ...notification, isRead: true });
      }
    }
  }
}

// Use the database storage implementation instead of memory storage
export const storage = new DatabaseStorage();
