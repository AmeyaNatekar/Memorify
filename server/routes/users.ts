import express from 'express';
const app = express();

// Mock database client for testing purposes
export const db = {
  user: {
    findMany: async (query: any) => {
      // Mock user data
      const users = [
        { id: 1, username: "testuser1" },
        { id: 2, username: "testuser2" },
        { id: 3, username: "Ameya0P" }
      ];
      // If no filter, return all
      if (!query || !query.where || !query.where.username || !query.where.username.contains) {
        return users;
      }
      const q = query.where.username.contains.toLowerCase();
      return users.filter(u =>
        u.username.toLowerCase().includes(q)
      );
    }
  }
};

app.get('/api/users/search', async (req, res) => {
  const q = req.query.q;
  if (!q || typeof q !== "string" || q.length < 3) {
    return res.json([]);
  }

  // Example: search users by username (case-insensitive)
  try {
    const users = await db.user.findMany({
      where: {
        username: {
          contains: q,
          mode: "insensitive"
        }
      },
      select: {
        id: true,
        username: true
        // Add other fields you want to return
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});