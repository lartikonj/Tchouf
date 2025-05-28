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
    const data = doc.data()!;
    return {
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
      avgRating: data.avgRating || 0,
      reviewCount: data.reviewCount || 0
    } as Business;
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
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: parseInt(doc.id),
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          avgRating: data.avgRating || 0,
          reviewCount: data.reviewCount || 0
        } as Business;
      });
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
  async createReview(insertReview: InsertReview): Promise<Review> {
    // Check if user already has a review for this business
    const existingReview = await this.getUserReviewForBusiness(insertReview.userId, insertReview.businessId);
    if (existingReview) {
      throw new Error('User already has a review for this business. Please update your existing review instead.');
    }

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

    // Update business rating after creating review
    await this.updateBusinessRating(result.businessId);

    return result;
  }

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
    const reviewsRef = db.collection('reviews');

    const snapshot = await reviewsRef
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const reviewsWithUsers: ReviewWithUser[] = [];
    for (const doc of snapshot.docs) {
      const review = { id: parseInt(doc.id), ...doc.data() } as Review;
      const userDoc = await db.collection('users').doc(review.userId.toString()).get();

      if (userDoc.exists) {
        const user = { id: review.userId, ...userDoc.data() } as User;
        reviewsWithUsers.push({ ...review, user });
      }
    }

    return reviewsWithUsers;
  }

  async getReviewsForUser(userId: number): Promise<any[]> {
    try {
      const reviewsRef = db.collection('reviews');

      const snapshot = await reviewsRef
        .where('userId', '==', userId)
        .get();

      const reviewsWithBusiness = [];
      for (const doc of snapshot.docs) {
        const review = { id: parseInt(doc.id), ...doc.data() };
        const businessDoc = await db.collection('businesses').doc(review.businessId.toString()).get();

        if (businessDoc.exists) {
          const business = { id: review.businessId, ...businessDoc.data() };
          reviewsWithBusiness.push({ 
            ...review, 
            createdAt: review.createdAt?.toDate ? review.createdAt.toDate() : new Date(review.createdAt),
            business: {
              id: business.id,
              name: business.name,
              category: business.category
            }
          });
        }
      }

      // Sort by createdAt in memory
      return reviewsWithBusiness.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting reviews for user:', error);
      return [];
    }
  }

  async getUserReviewForBusiness(userId: number, businessId: number): Promise<Review | null> {
    try {
      const snapshot = await db.collection('reviews')
        .where('userId', '==', userId)
        .where('businessId', '==', businessId)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: parseInt(doc.id),
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
      } as Review;
    } catch (error) {
      console.error('Error getting user review for business:', error);
      return null;
    }
  }

  async updateUserPhoto(userId: number, photoURL: string): Promise<User | null> {
    const userRef = db.collection('users').doc(userId.toString());

    await userRef.update({ photoURL });

    const userDoc = await userRef.get();
    if (!userDoc.exists) return null;

    return { id: userId, ...userDoc.data() } as User;
  }

  async deleteUser(userId: number): Promise<boolean> {
    const userRef = db.collection('users').doc(userId.toString());

    // Also delete user's reviews and businesses
    const reviewsSnapshot = await db.collection('reviews').where('userId', '==', userId).get();
    const businessesSnapshot = await db.collection('businesses').where('createdBy', '==', userId).get();

    const batch = db.batch();

    reviewsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    businessesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(userRef);

    await batch.commit();
    return true;
  }

  async updateReview(reviewId: number, updateData: Partial<InsertReview>): Promise<Review | null> {
    const reviewRef = db.collection('reviews').doc(reviewId.toString());
    const reviewDoc = await reviewRef.get();

    if (!reviewDoc.exists) return null;

    await reviewRef.update(updateData);

    const updatedDoc = await reviewRef.get();
    const review = { id: reviewId, ...updatedDoc.data() } as Review;

    // Update business average rating
    await this.updateBusinessRating(review.businessId);

    return review;
  }

  async deleteReview(reviewId: number): Promise<boolean> {
    const reviewRef = db.collection('reviews').doc(reviewId.toString());
    const reviewDoc = await reviewRef.get();

    if (!reviewDoc.exists) return false;

    const reviewData = reviewDoc.data();
    await reviewRef.delete();

    // Update business average rating
    if (reviewData?.businessId) {
      await this.updateBusinessRating(reviewData.businessId);
    }

    return true;
  }

  private async updateBusinessRating(businessId: number): Promise<void> {
    const reviewsSnapshot = await db.collection('reviews')
      .where('businessId', '==', businessId)
      .get();

    if (reviewsSnapshot.empty) {
      await db.collection('businesses').doc(businessId.toString()).update({
        avgRating: 0,
        reviewCount: 0
      });
      return;
    }

    const reviews = reviewsSnapshot.docs.map(doc => doc.data());
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const avgRating = totalRating / reviews.length;

    await db.collection('businesses').doc(businessId.toString()).update({
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount: reviews.length
    });
  }

  async getBusinessesForUser(userId: number): Promise<Business[]> {
    try {
      // Get businesses created by user
      const createdSnapshot = await db.collection('businesses')
        .where('createdBy', '==', userId)
        .get();

      // Get businesses claimed by user
      const claimedSnapshot = await db.collection('businesses')
        .where('claimedBy', '==', userId)
        .get();

      const createdBusinesses = createdSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: parseInt(doc.id),
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          avgRating: data.avgRating || 0,
          reviewCount: data.reviewCount || 0
        } as Business;
      });

      const claimedBusinesses = claimedSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: parseInt(doc.id),
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          avgRating: data.avgRating || 0,
          reviewCount: data.reviewCount || 0
        } as Business;
      });

      // Combine and remove duplicates
      const allBusinesses = [...createdBusinesses];
      claimedBusinesses.forEach(business => {
        if (!allBusinesses.find(b => b.id === business.id)) {
          allBusinesses.push(business);
        }
      });

      return allBusinesses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error getting businesses for user:', error);
      return [];
    }
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
    // Check if user already has a claim for this business
    const existingClaim = await this.getUserClaimForBusiness(insertClaim.userId, insertClaim.businessId);
    if (existingClaim) {
      throw new Error('You have already submitted a claim for this business.');
    }

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

  async getUserClaimForBusiness(userId: number, businessId: number): Promise<Claim | null> {
    try {
      const snapshot = await db.collection('claims')
        .where('userId', '==', userId)
        .where('businessId', '==', businessId)
        .get();

      if (snapshot.empty) return null;

      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: parseInt(doc.id),
        ...data,
        submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt),
        reviewedAt: data.reviewedAt?.toDate ? data.reviewedAt.toDate() : data.reviewedAt
      } as Claim;
    } catch (error) {
      console.error('Error getting user claim for business:', error);
      return null;
    }
  }

  async getClaimsForUser(userId: number): Promise<any[]> {
    try {
      const snapshot = await db.collection('claims')
        .where('userId', '==', userId)
        .get();

      const claimsWithBusiness = [];
      for (const doc of snapshot.docs) {
        const claim = { id: parseInt(doc.id), ...doc.data() };
        const businessDoc = await db.collection('businesses').doc(claim.businessId.toString()).get();

        if (businessDoc.exists) {
          const business = { id: claim.businessId, ...businessDoc.data() };
          claimsWithBusiness.push({ 
            ...claim, 
            submittedAt: claim.submittedAt?.toDate ? claim.submittedAt.toDate() : new Date(claim.submittedAt),
            reviewedAt: claim.reviewedAt?.toDate ? claim.reviewedAt.toDate() : claim.reviewedAt,
            business: {
              id: business.id,
              name: business.name,
              category: business.category,
              city: business.city
            }
          });
        }
      }

      return claimsWithBusiness.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
    } catch (error) {
      console.error('Error getting claims for user:', error);
      return [];
    }
  }

  async updateClaim(claimId: number, updateData: Partial<InsertClaim>): Promise<Claim | null> {
    try {
      const claimRef = db.collection('claims').doc(claimId.toString());
      const claimDoc = await claimRef.get();

      if (!claimDoc.exists) return null;

      await claimRef.update(updateData);

      const updatedDoc = await claimRef.get();
      const data = updatedDoc.data()!;
      return {
        id: claimId,
        ...data,
        submittedAt: data.submittedAt?.toDate ? data.submittedAt.toDate() : new Date(data.submittedAt),
        reviewedAt: data.reviewedAt?.toDate ? data.reviewedAt.toDate() : data.reviewedAt
      } as Claim;
    } catch (error) {
      console.error('Error updating claim:', error);
      return null;
    }
  }

  async deleteClaim(claimId: number): Promise<boolean> {
    try {
      const claimRef = db.collection('claims').doc(claimId.toString());
      const claimDoc = await claimRef.get();

      if (!claimDoc.exists) return false;

      await claimRef.delete();
      return true;
    } catch (error) {
      console.error('Error deleting claim:', error);
      return false;
    }
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

  async updateBusiness(id: number, updates: Partial<Business>): Promise<Business | undefined> {
    const snapshot = await db.collection('businesses').where('id', '==', id).get();
    if (snapshot.empty) return undefined;

    const doc = snapshot.docs[0];
    const updatedBusiness = { ...doc.data(), ...updates };
    await doc.ref.update(updatedBusiness);
    return updatedBusiness as Business;
  }

  async deleteBusiness(id: number): Promise<boolean> {
    const batch = db.batch();

    // Delete the business
    const businessSnapshot = await db.collection('businesses').where('id', '==', id).get();
    if (businessSnapshot.empty) return false;

    const businessDoc = businessSnapshot.docs[0];
    batch.delete(businessDoc.ref);

    // Delete associated reviews
    const reviewsSnapshot = await db.collection('reviews').where('businessId', '==', id).get();
    reviewsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Delete associated claims
    const claimsSnapshot = await db.collection('claims').where('businessId', '==', id).get();
    claimsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
    return true;
  }
}

// Export the storage instance
export const storage = new FirebaseStorage();