import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { 
  type User, type InsertUser,
  type Business, type InsertBusiness, type BusinessWithReviews,
  type Review, type InsertReview, type ReviewWithUser,
  type Claim, type InsertClaim, type ClaimWithData
} from "@shared/schema";
import { IStorage } from "./storage";

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}

const db = getFirestore();

export class FirebaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const snapshot = await db.collection('users').where('id', '==', id).get();
    if (snapshot.empty) return undefined;
    return snapshot.docs[0].data() as User;
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    const snapshot = await db.collection('users').where('uid', '==', uid).get();
    if (snapshot.empty) return undefined;
    return snapshot.docs[0].data() as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const snapshot = await db.collection('users').where('email', '==', email).get();
    if (snapshot.empty) return undefined;
    return snapshot.docs[0].data() as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const usersRef = db.collection('users');
    const counterRef = db.collection('counters').doc('users');
    
    // Get next ID
    const result = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentId = counterDoc.exists ? counterDoc.data()?.count || 0 : 0;
      const newId = currentId + 1;
      
      const user: User = {
        ...insertUser,
        id: newId,
        createdAt: new Date(),
      };
      
      transaction.set(counterRef, { count: newId });
      transaction.set(usersRef.doc(newId.toString()), user);
      
      return user;
    });
    
    return result;
  }

  // Business operations
  async getBusiness(id: number): Promise<Business | undefined> {
    const doc = await db.collection('businesses').doc(id.toString()).get();
    if (!doc.exists) return undefined;
    return doc.data() as Business;
  }

  async getBusinessWithReviews(id: number): Promise<BusinessWithReviews | undefined> {
    const business = await this.getBusiness(id);
    if (!business) return undefined;

    const reviewsSnapshot = await db.collection('reviews')
      .where('businessId', '==', id)
      .get();
    
    const reviews = reviewsSnapshot.docs.map(doc => doc.data() as Review);
    
    let claimedByUser: User | undefined;
    if (business.claimedBy) {
      claimedByUser = await this.getUser(business.claimedBy);
    }
    
    const createdByUser = await this.getUser(business.createdBy);
    if (!createdByUser) return undefined;

    return {
      ...business,
      reviews,
      claimedByUser,
      createdByUser,
    };
  }

  async getBusinesses(limit = 20, offset = 0): Promise<Business[]> {
    const snapshot = await db.collection('businesses')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Business);
  }

  async searchBusinesses(query: string, city?: string, category?: string): Promise<Business[]> {
    let businessQuery = db.collection('businesses').orderBy('createdAt', 'desc');
    
    if (city) {
      businessQuery = businessQuery.where('city', '==', city);
    }
    
    if (category) {
      businessQuery = businessQuery.where('category', '==', category);
    }
    
    const snapshot = await businessQuery.get();
    let businesses = snapshot.docs.map(doc => doc.data() as Business);
    
    // Client-side filtering for text search (Firestore doesn't support full-text search)
    if (query) {
      const lowerQuery = query.toLowerCase();
      businesses = businesses.filter(business => 
        business.name.toLowerCase().includes(lowerQuery) ||
        business.description?.toLowerCase().includes(lowerQuery)
      );
    }
    
    return businesses;
  }

  async createBusiness(insertBusiness: InsertBusiness): Promise<Business> {
    const businessesRef = db.collection('businesses');
    const counterRef = db.collection('counters').doc('businesses');
    
    const result = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentId = counterDoc.exists ? counterDoc.data()?.count || 0 : 0;
      const newId = currentId + 1;
      
      const business: Business = {
        ...insertBusiness,
        id: newId,
        avgRating: 0,
        reviewCount: 0,
        verified: false,
        claimedBy: null,
        createdAt: new Date(),
      };
      
      transaction.set(counterRef, { count: newId });
      transaction.set(businessesRef.doc(newId.toString()), business);
      
      return business;
    });
    
    return result;
  }

  async updateBusiness(id: number, updates: Partial<Business>): Promise<Business | undefined> {
    const docRef = db.collection('businesses').doc(id.toString());
    await docRef.update(updates);
    
    const doc = await docRef.get();
    return doc.exists ? doc.data() as Business : undefined;
  }

  async getBusinessesByCategory(category: string): Promise<Business[]> {
    const snapshot = await db.collection('businesses')
      .where('category', '==', category)
      .orderBy('avgRating', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Business);
  }

  async getFeaturedBusinesses(limit = 6): Promise<Business[]> {
    const snapshot = await db.collection('businesses')
      .limit(limit)
      .get();
    
    const businesses = snapshot.docs.map(doc => doc.data() as Business);
    // Sort by rating on the client side to avoid index requirements
    return businesses.sort((a, b) => b.avgRating - a.avgRating);
  }

  // Review operations
  async getReview(id: number): Promise<Review | undefined> {
    const doc = await db.collection('reviews').doc(id.toString()).get();
    if (!doc.exists) return undefined;
    return doc.data() as Review;
  }

  async getReviewsForBusiness(businessId: number): Promise<ReviewWithUser[]> {
    const reviewsSnapshot = await db.collection('reviews')
      .where('businessId', '==', businessId)
      .orderBy('createdAt', 'desc')
      .get();
    
    const reviewsWithUsers: ReviewWithUser[] = [];
    
    for (const doc of reviewsSnapshot.docs) {
      const review = doc.data() as Review;
      const user = await this.getUser(review.userId);
      if (user) {
        reviewsWithUsers.push({ ...review, user });
      }
    }
    
    return reviewsWithUsers;
  }

  async getRecentReviews(limit = 6): Promise<ReviewWithUser[]> {
    const reviewsSnapshot = await db.collection('reviews')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    const reviewsWithUsers: ReviewWithUser[] = [];
    
    for (const doc of reviewsSnapshot.docs) {
      const review = doc.data() as Review;
      const user = await this.getUser(review.userId);
      if (user) {
        reviewsWithUsers.push({ ...review, user });
      }
    }
    
    return reviewsWithUsers;
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const reviewsRef = db.collection('reviews');
    const counterRef = db.collection('counters').doc('reviews');
    
    const result = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentId = counterDoc.exists ? counterDoc.data()?.count || 0 : 0;
      const newId = currentId + 1;
      
      const review: Review = {
        ...insertReview,
        id: newId,
        createdAt: new Date(),
      };
      
      transaction.set(counterRef, { count: newId });
      transaction.set(reviewsRef.doc(newId.toString()), review);
      
      return review;
    });
    
    // Update business rating
    await this.updateBusinessRating(insertReview.businessId);
    
    return result;
  }

  async updateBusinessRating(businessId: number): Promise<void> {
    const reviewsSnapshot = await db.collection('reviews')
      .where('businessId', '==', businessId)
      .get();
    
    const reviews = reviewsSnapshot.docs.map(doc => doc.data() as Review);
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = reviews.length > 0 ? totalRating / reviews.length : 0;
    
    await db.collection('businesses').doc(businessId.toString()).update({
      avgRating,
      reviewCount: reviews.length,
    });
  }

  // Claim operations
  async getClaim(id: number): Promise<Claim | undefined> {
    const doc = await db.collection('claims').doc(id.toString()).get();
    if (!doc.exists) return undefined;
    return doc.data() as Claim;
  }

  async getClaimsForBusiness(businessId: number): Promise<Claim[]> {
    const snapshot = await db.collection('claims')
      .where('businessId', '==', businessId)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as Claim);
  }

  async getPendingClaims(): Promise<ClaimWithData[]> {
    const claimsSnapshot = await db.collection('claims')
      .where('status', '==', 'pending')
      .orderBy('submittedAt', 'desc')
      .get();
    
    const claimsWithData: ClaimWithData[] = [];
    
    for (const doc of claimsSnapshot.docs) {
      const claim = doc.data() as Claim;
      const business = await this.getBusiness(claim.businessId);
      const user = await this.getUser(claim.userId);
      
      if (business && user) {
        claimsWithData.push({ ...claim, business, user });
      }
    }
    
    return claimsWithData;
  }

  async createClaim(insertClaim: InsertClaim): Promise<Claim> {
    const claimsRef = db.collection('claims');
    const counterRef = db.collection('counters').doc('claims');
    
    const result = await db.runTransaction(async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      const currentId = counterDoc.exists ? counterDoc.data()?.count || 0 : 0;
      const newId = currentId + 1;
      
      const claim: Claim = {
        ...insertClaim,
        id: newId,
        status: "pending",
        submittedAt: new Date(),
      };
      
      transaction.set(counterRef, { count: newId });
      transaction.set(claimsRef.doc(newId.toString()), claim);
      
      return claim;
    });
    
    return result;
  }

  async updateClaimStatus(id: number, status: "approved" | "rejected"): Promise<Claim | undefined> {
    const claimRef = db.collection('claims').doc(id.toString());
    
    const result = await db.runTransaction(async (transaction) => {
      const claimDoc = await transaction.get(claimRef);
      if (!claimDoc.exists) return undefined;
      
      const claim = claimDoc.data() as Claim;
      const updatedClaim = { ...claim, status };
      
      transaction.update(claimRef, { status });
      
      // If approved, update the business
      if (status === "approved") {
        const businessRef = db.collection('businesses').doc(claim.businessId.toString());
        transaction.update(businessRef, {
          claimedBy: claim.userId,
          verified: true,
        });
      }
      
      return updatedClaim;
    });
    
    return result;
  }
}