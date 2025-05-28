
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});


import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./firebase-storage";
import { insertUserSchema, insertBusinessSchema, insertReviewSchema, insertClaimSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User routes
  app.get("/api/user", async (req, res, next) => {
    try {
      // This would normally use authentication middleware
      // For now, return empty response
      res.json(null);
    } catch (error) {
      console.error('Error in /api/user:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

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

      // Update user admin status through storage layer
      await storage.updateUserAdmin(id, isAdmin);

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
      console.error('Error fetching businesses:', error);
      res.status(500).json({ error: 'Failed to fetch businesses' });
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

  app.get('/api/businesses/:identifier', async (req, res) => {
    try {
      const identifier = req.params.identifier;
      let business;

      // Check if identifier is a number (ID) or string (slug)
      if (/^\d+$/.test(identifier)) {
        const businessId = parseInt(identifier);
        business = await storage.getBusiness(businessId);
      } else {
        business = await storage.getBusinessBySlug(identifier);
      }

      if (!business) {
        return res.status(404).json({ error: 'Business not found' });
      }

      // Get owner information if business is claimed and verified
      let owner = null;
      if (business.claimedBy && business.verified) {
        const ownerData = await storage.getUser(business.claimedBy);
        if (ownerData) {
          owner = {
            id: ownerData.id,
            email: ownerData.email,
            displayName: ownerData.displayName,
            photoURL: ownerData.photoURL,
          };
        }
      }

      // Ensure we have the complete business data structure
      const completeBusinessData = {
        ...business,
        // Ensure hours field is available (might be stored as openingHours)
        hours: business.hours || business.openingHours || null,
        // Ensure owner information is properly structured
        owner,
        // Ensure verification status is clear
        verified: business.verified || false,
        claimedBy: business.claimedBy || null
      };

      res.json(completeBusinessData);
    } catch (error) {
      console.error('Error fetching business:', error);
      res.status(500).json({ error: 'Failed to fetch business' });
    }
  });

  app.post("/api/businesses", async (req, res, next) => {
    try {
      console.log('Received business creation request:', req.body);
      
      // Validate the request body
      if (!req.body) {
        console.error('No request body provided');
        return res.status(400).json({ error: 'No data provided' });
      }

      const businessData = insertBusinessSchema.parse(req.body);
      console.log('Parsed business data:', businessData);
      
      const business = await storage.createBusiness(businessData);
      console.log('Business created successfully:', business);
      
      res.status(201).json(business);
    } catch (error) {
      console.error('Error creating business:', error);
      
      if (error instanceof Error) {
        if (error.name === 'ZodError') {
          return res.status(400).json({ 
            error: 'Validation failed', 
            details: error.message 
          });
        }
        return res.status(500).json({ 
          error: 'Internal server error', 
          message: error.message 
        });
      }
      
      res.status(500).json({ error: 'Unknown error occurred' });
    }
  });

  app.patch("/api/businesses/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const business = await storage.updateBusiness(id, updates);
      if (!business) {
        return res.status(404).json({ message: "Business not found" });
      }
      res.json(business);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/businesses/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteBusiness(id);
      if (!success) {
        return res.status(404).json({ message: "Business not found" });
      }
      res.json({ message: "Business deleted successfully" });
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
      const currentUserId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const reviews = await storage.getReviewsForBusiness(businessId, currentUserId);
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
      res.json({ ...claim, success: true });
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

  // Review likes and reports routes
  app.post("/api/reviews/:id/like", async (req, res, next) => {
    try {
      const reviewId = parseInt(req.params.id);
      const { userId } = req.body;
      const isLiked = await storage.likeReview(reviewId, userId);
      res.json({ liked: isLiked });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/reviews/:id/report", async (req, res, next) => {
    try {
      const reviewId = parseInt(req.params.id);
      const { userId, reason } = req.body;
      await storage.reportReview(reviewId, userId, reason);
      res.json({ success: true });
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

  // Get user's claims
  app.get('/api/users/:userId/claims', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      console.log('Fetching claims for user:', userId);
      const claims = await storage.getClaimsForUser(userId);
      console.log('Found claims:', claims);
      res.json(claims);
    } catch (error) {
      console.error('Error fetching user claims:', error);
      res.status(500).json({ error: 'Failed to fetch claims' });
    }
  });

  app.get("/api/users/:userId/claims/business/:businessId", async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const businessId = parseInt(req.params.businessId);
      const claim = await storage.getUserClaimForBusiness(userId, businessId);
      if (!claim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      res.json(claim);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/claims/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const claimData = insertClaimSchema.parse(req.body);
      const claim = await storage.updateClaim(id, claimData);
      if (!claim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      res.json(claim);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/claims/:id", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteClaim(id);
      if (!success) {
        return res.status(404).json({ message: "Claim not found" });
      }
      res.json({ message: "Claim deleted successfully" });
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

  app.patch("/api/users/:id/profile", async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const updates = z.object({ 
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        displayName: z.string().optional()
      }).parse(req.body);

      const user = await storage.updateUserProfile(id, updates);
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

      // Update user to be admin through storage layer
      await storage.updateUserAdmin(user.id, true);

      const updatedUser = await storage.getUser(user.id);
      res.json(updatedUser);
    } catch (error) {
      next(error);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}