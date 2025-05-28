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

    const reviews = await this.getReviewsForBusiness(id);
    return { ...business, reviews };
  }

  async getBusinesses(limit = 20, offset = 0): Promise<Business[]> {
    try {
      const snapshot = await db.collection('businesses').limit(limit).offset(offset).get();
      return snapshot.docs.map(doc => doc.data() as Business);
    } catch (error) {
      console.error('Error getting businesses:', error);
      return [];
    }
  }

  async getFeaturedBusinesses(limit = 6): Promise<Business[]> {
    try {
      const snapshot = await db.collection('businesses')
        .where('featured', '==', true)
        .limit(limit)
        .get();
      
      if (snapshot.empty) {
        // If no featured businesses, return top-rated ones
        const fallbackSnapshot = await db.collection('businesses')
          .orderBy('avgRating', 'desc')
          .limit(limit)
          .get();
        return fallbackSnapshot.docs.map(doc => doc.data() as Business);
      }
      
      return snapshot.docs.map(doc => doc.data() as Business);
    } catch (error) {
      console.error('Error getting featured businesses:', error);
      return [];
    }
  }

  async searchBusinesses(query: string, city?: string, category?: string): Promise<Business[]> {
    try {
      let collectionRef = db.collection('businesses');
      
      // Apply filters
      if (category) {
        collectionRef = collectionRef.where('category', '==', category);
      }
      if (city) {
        collectionRef = collectionRef.where('city', '==', city);
      }
      
      const snapshot = await collectionRef.get();
      let businesses = snapshot.docs.map(doc => doc.data() as Business);
      
      // Filter by query if provided
      if (query) {
        const lowerQuery = query.toLowerCase();
        businesses = businesses.filter(business => 
          business.name.toLowerCase().includes(lowerQuery) ||
          business.description?.toLowerCase().includes(lowerQuery) ||
          business.category.toLowerCase().includes(lowerQuery)
        );
      }
      
      return businesses;
    } catch (error) {
      console.error('Error searching businesses:', error);
      return [];
    }
  }

  async getBusinessesByCategory(category: string): Promise<Business[]> {
    try {
      const snapshot = await db.collection('businesses').where('category', '==', category).get();
      return snapshot.docs.map(doc => doc.data() as Business);
    } catch (error) {
      console.error('Error getting businesses by category:', error);
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
        avgRating: 0,
        reviewCount: 0,
        photos: insertBusiness.photos || [],
        hours: insertBusiness.hours || {},
        amenities: insertBusiness.amenities || [],
        verified: false,
        featured: false,
        claimedBy: null,
        createdAt: new Date(),
      };

      transaction.set(counterRef, { count: newId });
      transaction.set(businessesRef.doc(newId.toString()), business);

      return business;
    });

    return result;
  }

  // Review operations
  async getReview(id: number): Promise<Review | undefined> {
    const doc = await db.collection('reviews').doc(id.toString()).get();
    if (!doc.exists) return undefined;
    const data = doc.data()!;
    return {
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
    } as Review;
  }

  async getReviewsForBusiness(businessId: number): Promise<ReviewWithUser[]> {
    try {
      const snapshot = await db.collection('reviews').where('businessId', '==', businessId).get();

      const reviews = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const reviewData = doc.data();
          const user = await this.getUser(reviewData.userId);

          return {
            ...reviewData,
            createdAt: reviewData.createdAt?.toDate ? reviewData.createdAt.toDate() : new Date(reviewData.createdAt),
            user: user || { id: reviewData.userId, email: 'Unknown', uid: '', createdAt: new Date(), isAdmin: false }
          } as ReviewWithUser;
        })
      );

      return reviews.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting reviews for business:', error);
      return [];
    }
  }

  async getRecentReviews(limit = 6): Promise<ReviewWithUser[]> {
    try {
      const snapshot = await db.collection('reviews').get();

      const reviews = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const reviewData = doc.data();
          const user = await this.getUser(reviewData.userId);
          const business = await this.getBusiness(reviewData.businessId);

          return {
            ...reviewData,
            createdAt: reviewData.createdAt?.toDate ? reviewData.createdAt.toDate() : new Date(reviewData.createdAt),
            user: user || { id: reviewData.userId, email: 'Unknown', uid: '', createdAt: new Date(), isAdmin: false },
            business
          } as ReviewWithUser;
        })
      );

      return reviews
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting recent reviews:', error);
      return [];
    }
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
        photos: insertReview.photos || [],
        createdAt: new Date(),
      };

      transaction.set(counterRef, { count: newId });
      transaction.set(reviewsRef.doc(newId.toString()), review);

      // Update business average rating
      const businessRef = db.collection('businesses').doc(insertReview.businessId.toString());
      const businessDoc = await transaction.get(businessRef);

      if (businessDoc.exists) {
        const businessData = businessDoc.data()!;
        const currentReviewCount = businessData.reviewCount || 0;
        const currentAvgRating = businessData.avgRating || 0;

        const newReviewCount = currentReviewCount + 1;
        const newAvgRating = ((currentAvgRating * currentReviewCount) + insertReview.rating) / newReviewCount;

        transaction.update(businessRef, {
          reviewCount: newReviewCount,
          avgRating: newAvgRating
        });
      }

      return review;
    });

    return result;
  }

  // Claim operations
  async getClaim(id: number): Promise<Claim | undefined> {
    const doc = await db.collection('claims').doc(id.toString()).get();
    if (!doc.exists) return undefined;
    const data = doc.data()!;
    return {
      ...data,
      submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt),
      reviewedAt: data.reviewedAt?.toDate ? data.reviewedAt.toDate() : data.reviewedAt
    } as Claim;
  }

  async getClaimsForBusiness(businessId: number): Promise<Claim[]> {
    try {
      const snapshot = await db.collection('claims').where('businessId', '==', businessId).get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt),
          reviewedAt: data.reviewedAt?.toDate ? data.reviewedAt.toDate() : data.reviewedAt
        } as Claim;
      });
    } catch (error) {
      console.error('Error getting claims for business:', error);
      return [];
    }
  }

  async getPendingClaims(): Promise<ClaimWithData[]> {
    try {
      const snapshot = await db.collection('claims').where('status', '==', 'pending').get();

      const claims = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const claimData = doc.data();
          const user = await this.getUser(claimData.userId);
          const business = await this.getBusiness(claimData.businessId);

          return {
            ...claimData,
            submittedAt: claimData.submittedAt?.toDate ? claimData.submittedAt.toDate() : new Date(claimData.submittedAt),
            reviewedAt: claimData.reviewedAt?.toDate ? claimData.reviewedAt.toDate() : claimData.reviewedAt,
            user: user!,
            business: business!
          } as ClaimWithData;
        })
      );

      return claims.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    } catch (error) {
      console.error('Error getting pending claims:', error);
      return [];
    }
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
        status: 'pending',
        submittedAt: new Date(),
        reviewedAt: null,
        reviewedBy: null,
      };

      transaction.set(counterRef, { count: newId });
      transaction.set(claimsRef.doc(newId.toString()), claim);

      return claim;
    });

    return result;
  }

  async updateClaimStatus(id: number, status: "approved" | "rejected"): Promise<Claim | undefined> {
    const claimRef = db.collection('claims').doc(id.toString());

    await claimRef.update({
      status,
      reviewedAt: new Date()
    });

    // If approved, update business to mark as claimed
    if (status === 'approved') {
      const claim = await this.getClaim(id);
      if (claim) {
        const businessRef = db.collection('businesses').doc(claim.businessId.toString());
        await businessRef.update({
          claimedBy: claim.userId,
          verified: true
        });
      }
    }

    return this.getClaim(id);
  }
}

// Export the storage instance
export const storage = new FirebaseStorage();