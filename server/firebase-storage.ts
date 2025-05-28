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
        displayName: insertUser.displayName || null,
        photoURL: insertUser.photoURL || null,
        isAdmin: false,
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
    try {
      const snapshot = await db.collection('businesses').get();
      
      const businesses = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
        } as Business;
      });
      
      return businesses
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(offset, offset + limit);
    } catch (error) {
      console.error('Error getting businesses:', error);
      return [];
    }
  }

  async searchBusinesses(query: string, city?: string, category?: string): Promise<Business[]> {
    try {
      // Get all businesses and filter on client side to avoid index requirements
      const snapshot = await db.collection('businesses').get();
      let businesses = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
        } as Business;
      });
      
      // Client-side filtering
      if (city) {
        businesses = businesses.filter(business => 
          business.city && business.city.toLowerCase().includes(city.toLowerCase())
        );
      }
      
      if (category) {
        businesses = businesses.filter(business => 
          business.category && business.category.toLowerCase() === category.toLowerCase()
        );
      }
      
      if (query) {
        const lowerQuery = query.toLowerCase();
        businesses = businesses.filter(business => 
          (business.name && business.name.toLowerCase().includes(lowerQuery)) ||
          (business.description && business.description.toLowerCase().includes(lowerQuery))
        );
      }
      
      return businesses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error searching businesses:', error);
      return [];
    }
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
        email: insertBusiness.email || null,
        description: insertBusiness.description || null,
        phone: insertBusiness.phone || null,
        website: insertBusiness.website || null,
        photos: insertBusiness.photos || [],
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
    try {
      const snapshot = await db.collection('businesses').get();
      
      const businesses = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
        } as Business;
      });
      
      return businesses
        .filter(business => business.category && business.category.toLowerCase() === category.toLowerCase())
        .sort((a, b) => b.avgRating - a.avgRating);
    } catch (error) {
      console.error('Error getting businesses by category:', error);
      return [];
    }
  }

  async getFeaturedBusinesses(limit = 6): Promise<Business[]> {
    try {
      const snapshot = await db.collection('businesses').get();
      
      const businesses = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
        } as Business;
      });
      
      // Sort by rating on the client side to avoid index requirements
      return businesses
        .sort((a, b) => b.avgRating - a.avgRating)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting featured businesses:', error);
      return [];
    }
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
        comment: insertReview.comment || null,
        photoUrl: insertReview.photoUrl || null,
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
        proofUrl: insertClaim.proofUrl || null,
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