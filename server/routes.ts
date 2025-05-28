import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./firebase-storage";
import { insertUserSchema, insertBusinessSchema, insertReviewSchema, insertClaimSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.post("/api/users", async (req, res, next) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.json(user);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/uid/:uid", async (req, res, next) => {
    try {
      const { uid } = req.params;
      const user = await storage.getUserByUid(uid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/users/:id/admin", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { isAdmin } = z.object({ isAdmin: z.boolean() }).parse(req.body);
      
      // For now, we'll add a simple implementation
      // In production, you'd want proper authentication middleware
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user admin status in Firebase
      const db = require('firebase-admin/firestore').getFirestore();
      await db.collection('users').doc(id.toString()).update({ isAdmin });
      
      const updatedUser = await storage.getUser(id);
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  });

  // Business routes
  app.get("/api/businesses", async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const businesses = await storage.getBusinesses(limit, offset);
      res.json(businesses);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/businesses/featured", async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 6;
      const businesses = await storage.getFeaturedBusinesses(limit);
      res.json(businesses);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/businesses/search", async (req, res, next) => {
    try {
      const { q: query, city, category } = req.query;
      const businesses = await storage.searchBusinesses(
        query as string || "",
        city as string,
        category as string
      );
      res.json(businesses);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/businesses/category/:category", async (req, res, next) => {
    try {
      const { category } = req.params;
      const businesses = await storage.getBusinessesByCategory(category);
      res.json(businesses);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/businesses/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const business = await storage.getBusinessWithReviews(id);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      res.json(business);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/businesses", async (req, res, next) => {
    try {
      const businessData = insertBusinessSchema.parse(req.body);
      const business = await storage.createBusiness(businessData);
      res.json(business);
    } catch (error) {
      next(error);
    }
  });

  // Review routes
  app.get("/api/reviews/recent", async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit as string) || 6;
      const reviews = await storage.getRecentReviews(limit);
      res.json(reviews);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/businesses/:id/reviews", async (req, res, next) => {
    try {
      const businessId = parseInt(req.params.id);
      const reviews = await storage.getReviewsForBusiness(businessId);
      res.json(reviews);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/reviews", async (req, res, next) => {
    try {
      const reviewData = insertReviewSchema.parse(req.body);
      const review = await storage.createReview(reviewData);
      res.json(review);
    } catch (error) {
      next(error);
    }
  });

  // Claim routes
  app.get("/api/claims/pending", async (req, res, next) => {
    try {
      const claims = await storage.getPendingClaims();
      res.json(claims);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/claims", async (req, res, next) => {
    try {
      const claimData = insertClaimSchema.parse(req.body);
      const claim = await storage.createClaim(claimData);
      res.json(claim);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/claims/:id/status", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = z.object({ status: z.enum(["approved", "rejected"]) }).parse(req.body);
      const claim = await storage.updateClaimStatus(id, status);
      if (!claim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      res.json(claim);
    } catch (error) {
      next(error);
    }
  });

  // User reviews routes
  app.get("/api/users/:id/reviews", async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const reviews = await storage.getReviewsForUser(userId);
      res.json(reviews);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:id/businesses", async (req, res, next) => {
    try {
      const userId = parseInt(req.params.id);
      const businesses = await storage.getBusinessesForUser(userId);
      res.json(businesses);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/users/:userId/reviews/business/:businessId", async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const businessId = parseInt(req.params.businessId);
      const review = await storage.getUserReviewForBusiness(userId, businessId);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      res.json(review);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/users/:id/photo", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { photoURL } = z.object({ photoURL: z.string() }).parse(req.body);
      
      const user = await storage.updateUserPhoto(id, photoURL);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/users/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/reviews/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const reviewData = insertReviewSchema.parse(req.body);
      const review = await storage.updateReview(id, reviewData);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      res.json(review);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/reviews/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteReview(id);
      if (!success) {
        return res.status(404).json({ message: "Review not found" });
      }
      res.json({ message: "Review deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Setup route to make first user admin (for initial setup)
  app.post("/api/setup/admin", async (req, res, next) => {
    try {
      const { uid } = z.object({ uid: z.string() }).parse(req.body);
      
      const user = await storage.getUserByUid(uid);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user to be admin in Firebase
      const { getFirestore } = require('firebase-admin/firestore');
      const db = getFirestore();
      await db.collection('users').doc(user.id.toString()).update({ isAdmin: true });
      
      const updatedUser = await storage.getUser(user.id);
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
