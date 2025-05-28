import { 
  users, businesses, reviews, claims,
  type User, type InsertUser,
  type Business, type InsertBusiness, type BusinessWithReviews,
  type Review, type InsertReview, type ReviewWithUser,
  type Claim, type InsertClaim, type ClaimWithData
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUid(uid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Business operations
  getBusiness(id: number): Promise<Business | undefined>;
  getBusinessBySlug(slug: string): Promise<Business | undefined>;
  getBusinessWithReviews(id: number): Promise<BusinessWithReviews | undefined>;
  getBusinesses(limit?: number, offset?: number): Promise<Business[]>;
  searchBusinesses(query: string, city?: string, category?: string): Promise<Business[]>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: number, updates: Partial<Business>): Promise<Business | undefined>;
  deleteBusiness(id: number): Promise<boolean>;
  getBusinessesByCategory(category: string): Promise<Business[]>;
  getFeaturedBusinesses(limit?: number): Promise<Business[]>;
  getBusinessesForUser(userId: number): Promise<Business[]>;

  // Review operations
  getReview(id: number): Promise<Review | undefined>;
  getReviewsForBusiness(businessId: number): Promise<ReviewWithUser[]>;
  getRecentReviews(limit?: number): Promise<ReviewWithUser[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateBusinessRating(businessId: number): Promise<void>;

  // Claim operations
  getClaim(id: number): Promise<Claim | undefined>;
  getClaimsForBusiness(businessId: number): Promise<Claim[]>;
  getPendingClaims(): Promise<ClaimWithData[]>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaimStatus(id: number, status: "approved" | "rejected"): Promise<Claim | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private businesses: Map<number, Business>;
  private reviews: Map<number, Review>;
  private claims: Map<number, Claim>;
  private currentUserId: number;
  private currentBusinessId: number;
  private currentReviewId: number;
  private currentClaimId: number;

  constructor() {
    this.users = new Map();
    this.businesses = new Map();
    this.reviews = new Map();
    this.claims = new Map();
    this.currentUserId = 1;
    this.currentBusinessId = 1;
    this.currentReviewId = 1;
    this.currentClaimId = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.uid === uid);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // Business operations
  async getBusiness(id: number): Promise<Business | undefined> {
    return this.businesses.get(id);
  }

  async getBusinessBySlug(slug: string): Promise<Business | undefined> {
    return Array.from(this.businesses.values()).find(business => business.slug === slug);
  }

  async getBusinessWithReviews(id: number): Promise<BusinessWithReviews | undefined> {
    const business = this.businesses.get(id);
    if (!business) return undefined;

    const businessReviews = Array.from(this.reviews.values())
      .filter(review => review.businessId === id);

    const claimedByUser = business.claimedBy ? this.users.get(business.claimedBy) : undefined;
    const createdByUser = this.users.get(business.createdBy);

    if (!createdByUser) return undefined;

    return {
      ...business,
      reviews: businessReviews,
      claimedByUser,
      createdByUser,
    };
  }

  async getBusinesses(limit = 20, offset = 0): Promise<Business[]> {
    const allBusinesses = Array.from(this.businesses.values());
    return allBusinesses.slice(offset, offset + limit);
  }

  async searchBusinesses(query: string, city?: string, category?: string): Promise<Business[]> {
    const allBusinesses = Array.from(this.businesses.values());

    return allBusinesses.filter(business => {
      const matchesQuery = !query || 
        business.name.toLowerCase().includes(query.toLowerCase()) ||
        business.description?.toLowerCase().includes(query.toLowerCase());

      const matchesCity = !city || business.city.toLowerCase().includes(city.toLowerCase());
      const matchesCategory = !category || business.category.toLowerCase() === category.toLowerCase();

      return matchesQuery && matchesCity && matchesCategory;
    });
  }

  async createBusiness(insertBusiness: InsertBusiness): Promise<Business> {
    const id = this.currentBusinessId++;
    
    // Generate slug if not provided
    let slug = insertBusiness.slug;
    if (!slug && insertBusiness.name) {
      slug = insertBusiness.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    }

    const business: Business = {
      ...insertBusiness,
      id,
      slug: slug || `business-${id}`,
      avgRating: 0,
      reviewCount: 0,
      verified: false,
      claimedBy: null,
      createdAt: new Date(),
    };
    this.businesses.set(id, business);
    return business;
  }

  async updateBusiness(id: number, updates: Partial<Business>): Promise<Business | undefined> {
    const business = this.businesses.get(id);
    if (!business) return undefined;

    const updatedBusiness = { ...business, ...updates };
    this.businesses.set(id, updatedBusiness);
    return updatedBusiness;
  }

  async deleteBusiness(id: number): Promise<boolean> {
    const business = this.businesses.get(id);
    if (!business) return false;

    // Delete associated reviews
    const businessReviews = Array.from(this.reviews.values()).filter(
      review => review.businessId === id
    );
    businessReviews.forEach(review => this.reviews.delete(review.id));

    // Delete associated claims
    const businessClaims = Array.from(this.claims.values()).filter(
      claim => claim.businessId === id
    );
    businessClaims.forEach(claim => this.claims.delete(claim.id));

    // Delete the business
    this.businesses.delete(id);
    return true;
  }

  async getBusinessesByCategory(category: string): Promise<Business[]> {
    return Array.from(this.businesses.values())
      .filter(business => business.category.toLowerCase() === category.toLowerCase());
  }

  async getFeaturedBusinesses(limit = 6): Promise<Business[]> {
    const allBusinesses = Array.from(this.businesses.values());
    return allBusinesses
      .sort((a, b) => b.avgRating - a.avgRating || b.reviewCount - a.reviewCount)
      .slice(0, limit);
  }

  async getBusinessesForUser(userId: number): Promise<Business[]> {
    return Array.from(this.businesses.values())
      .filter(business => business.createdBy === userId || business.claimedBy === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // Review operations
  async getReview(id: number): Promise<Review | undefined> {
    return this.reviews.get(id);
  }

  async getReviewsForBusiness(businessId: number): Promise<ReviewWithUser[]> {
    const businessReviews = Array.from(this.reviews.values())
      .filter(review => review.businessId === businessId);

    const reviewsWithUsers: ReviewWithUser[] = [];
    for (const review of businessReviews) {
      const user = this.users.get(review.userId);
      if (user) {
        reviewsWithUsers.push({ ...review, user });
      }
    }

    return reviewsWithUsers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getRecentReviews(limit = 6): Promise<ReviewWithUser[]> {
    const allReviews = Array.from(this.reviews.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    const reviewsWithUsers: ReviewWithUser[] = [];
    for (const review of allReviews) {
      const user = this.users.get(review.userId);
      if (user) {
        reviewsWithUsers.push({ ...review, user });
      }
    }

    return reviewsWithUsers;
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = this.currentReviewId++;
    const review: Review = {
      ...insertReview,
      id,
      createdAt: new Date(),
    };
    this.reviews.set(id, review);

    // Update business rating
    await this.updateBusinessRating(insertReview.businessId);

    return review;
  }

  async updateBusinessRating(businessId: number): Promise<void> {
    const business = this.businesses.get(businessId);
    if (!business) return;

    const businessReviews = Array.from(this.reviews.values())
      .filter(review => review.businessId === businessId);

    const totalRating = businessReviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = businessReviews.length > 0 ? totalRating / businessReviews.length : 0;

    const updatedBusiness = {
      ...business,
      avgRating,
      reviewCount: businessReviews.length,
    };

    this.businesses.set(businessId, updatedBusiness);
  }

  // Claim operations
  async getClaim(id: number): Promise<Claim | undefined> {
    return this.claims.get(id);
  }

  async getClaimsForBusiness(businessId: number): Promise<Claim[]> {
    return Array.from(this.claims.values())
      .filter(claim => claim.businessId === businessId);
  }

  async getPendingClaims(): Promise<ClaimWithData[]> {
    const pendingClaims = Array.from(this.claims.values())
      .filter(claim => claim.status === "pending");

    const claimsWithData: ClaimWithData[] = [];
    for (const claim of pendingClaims) {
      const business = this.businesses.get(claim.businessId);
      const user = this.users.get(claim.userId);
      if (business && user) {
        claimsWithData.push({ ...claim, business, user });
      }
    }

    return claimsWithData.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async createClaim(insertClaim: InsertClaim): Promise<Claim> {
    const id = this.currentClaimId++;
    const claim: Claim = {
      ...insertClaim,
      id,
      status: "pending",
      submittedAt: new Date(),
    };
    this.claims.set(id, claim);
    return claim;
  }

  async updateClaimStatus(id: number, status: "approved" | "rejected"): Promise<Claim | undefined> {
    const claim = this.claims.get(id);
    if (!claim) return undefined;

    const updatedClaim = { ...claim, status };
    this.claims.set(id, updatedClaim);

    // If approved, update the business
    if (status === "approved") {
      const business = this.businesses.get(claim.businessId);
      if (business) {
        const updatedBusiness = {
          ...business,
          claimedBy: claim.userId,
          verified: true,
        };
        this.businesses.set(claim.businessId, updatedBusiness);
      }
    }

    return updatedClaim;
  }

  constructor() {
    this.users = new Map();
    this.businesses = new Map();
    this.reviews = new Map();
    this.claims = new Map();
    this.currentUserId = 1;
    this.currentBusinessId = 1;
    this.currentReviewId = 1;
    this.currentClaimId = 1;

    // Sample data
    this.users.set(1, {
      id: 1,
      uid: "sample-uid-1",
      email: "user1@example.com",
      firstName: "John",
      lastName: "Doe",
      createdAt: new Date(),
    });

    this.businesses.set(1, {
      id: 1,
      name: "Café Aroma",
      slug: "cafe-aroma",
      category: "restaurant",
      description: "A cozy coffee shop with delicious pastries",
      city: "Algiers",
      address: "123 Main Street, Algiers",
      phone: "+213555123456",
      email: "contact@cafearoma.dz",
      website: "https://cafearoma.dz",
      photos: ["https://images.unsplash.com/photo-1554118811-1e0d58224f24"],
      createdBy: 1,
      claimedBy: null,
      verified: false,
      avgRating: 4.5,
      reviewCount: 12,
      createdAt: new Date("2024-01-15"),
    });

    this.businesses.set(2, {
      id: 2,
      name: "Pizza Palace",
	  slug: "pizza-palace",
      category: "restaurant",
      description: "The best pizza in town",
      city: "Algiers",
      address: "456 Elm Street, Algiers",
      phone: "+213555654321",
      email: "info@pizzapalace.dz",
      website: "https://pizzapalace.dz",
      photos: ["https://images.unsplash.com/photo-1565007458633-89dbf8a87491"],
      createdBy: 1,
      claimedBy: null,
      verified: false,
      avgRating: 4.0,
      reviewCount: 8,
      createdAt: new Date("2024-02-01"),
    });

    this.businesses.set(3, {
      id: 3,
      name: "Salon de Thé Zohra",
	  slug: "salon-de-the-zohra",
      category: "cafe",
      description: "Traditional Algerian tea and sweets",
      city: "Oran",
      address: "789 Oak Street, Oran",
      phone: "+213555112233",
      email: "zohra@salondethe.dz",
      website: "https://salondethe.dz",
      photos: ["https://images.unsplash.com/photo-1617922154574-cd56c2e18e84"],
      createdBy: 1,
      claimedBy: null,
      verified: false,
      avgRating: 4.8,
      reviewCount: 15,
      createdAt: new Date("2024-02-10"),
    });

    this.reviews.set(1, {
      id: 1,
      businessId: 1,
      userId: 1,
      rating: 5,
      comment: "Great coffee and pastries!",
      createdAt: new Date("2024-01-20"),
    });

    this.reviews.set(2, {
      id: 2,
      businessId: 1,
      userId: 1,
      rating: 4,
      comment: "Nice atmosphere.",
      createdAt: new Date("2024-01-25"),
    });

    this.claims.set(1, {
      id: 1,
      businessId: 2,
      userId: 1,
      status: "pending",
      submittedAt: new Date("2024-02-05"),
    });
  }
}

import { FirebaseStorage } from './firebase-storage';

// Use Firebase storage in production, MemStorage for development/testing
export const storage = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
  ? new FirebaseStorage() 
  : new MemStorage();