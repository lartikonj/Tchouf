
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useFirebaseStorage } from '@/hooks/use-firebase-storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ReviewForm } from '@/components/review-form';
import { 
  User, 
  Building, 
  Star, 
  Settings, 
  Camera, 
  Trash2, 
  Edit, 
  MapPin,
  Calendar,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';

interface Business {
  id: number;
  name: string;
  category: string;
  city: string;
  avgRating: number;
  reviewCount: number;
  verified: boolean;
  createdAt: string;
}

interface ReviewWithBusiness {
  id: number;
  businessId: number;
  rating: number;
  comment?: string;
  photoUrl?: string;
  createdAt: string;
  business: {
    id: number;
    name: string;
    category: string;
  };
}

interface ClaimWithBusiness {
  id: number;
  businessId: number;
  userId: number;
  proofUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  business: {
    id: number;
    name: string;
    category: string;
    city: string;
  };
}

export default function UserProfile() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { uploadFile, uploading } = useFirebaseStorage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editReviewOpen, setEditReviewOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<ReviewWithBusiness | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<ClaimWithBusiness | null>(null);
  const [claimDeleteDialogOpen, setClaimDeleteDialogOpen] = useState(false);

  // Fetch user's businesses
  const { data: userBusinesses, isLoading: businessesLoading } = useQuery({
    queryKey: [`/api/users/${user?.id}/businesses`],
    enabled: !!user?.id,
  });

  // Fetch user's reviews
  const { data: userReviews, isLoading: reviewsLoading } = useQuery({
    queryKey: [`/api/users/${user?.id}/reviews`],
    enabled: !!user?.id,
  });

  // Fetch user's claims
  const { data: userClaims, isLoading: claimsLoading } = useQuery({
    queryKey: [`/api/users/${user?.id}/claims`],
    enabled: !!user?.id,
  });

  // Delete review mutation
  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: number) => {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete review');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/reviews`] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/businesses/featured'] });
      toast({
        title: "Success",
        description: "Review deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete review",
        variant: "destructive",
      });
    },
  });

  // Upload photo mutation
  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const photoUrl = await uploadFile(file, 'profile-photos');
      
      const response = await fetch(`/api/users/${user?.id}/photo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoURL: photoUrl }),
      });
      
      if (!response.ok) throw new Error('Failed to update photo');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/uid/${user?.uid}`] });
      setPhotoDialogOpen(false);
      toast({
        title: "Success",
        description: "Profile photo updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile photo",
        variant: "destructive",
      });
    },
  });

  // Delete claim mutation
  const deleteClaimMutation = useMutation({
    mutationFn: async (claimId: number) => {
      const response = await fetch(`/api/claims/${claimId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete claim');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/claims`] });
      setClaimDeleteDialogOpen(false);
      setSelectedClaim(null);
      toast({
        title: "Success",
        description: "Claim deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete claim",
        variant: "destructive",
      });
    },
  });

  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/users/${user?.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete account');
      return response.json();
    },
    onSuccess: () => {
      signOut();
      navigate('/');
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadPhotoMutation.mutate(file);
    }
  };

  const handleEditReview = (review: ReviewWithBusiness) => {
    setSelectedReview(review);
    setEditReviewOpen(true);
  };

  const handleDeleteReview = (reviewId: number) => {
    deleteReviewMutation.mutate(reviewId);
  };

  const handleDeleteClaim = (claim: ClaimWithBusiness) => {
    setSelectedClaim(claim);
    setClaimDeleteDialogOpen(true);
  };

  const confirmDeleteClaim = () => {
    if (selectedClaim) {
      deleteClaimMutation.mutate(selectedClaim.id);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'fill-[#FF6F00] text-[#FF6F00]' 
            : i < rating 
              ? 'fill-[#FF6F00]/50 text-[#FF6F00]' 
              : 'text-gray-300'
        }`}
      />
    ));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please Sign In</h2>
          <p className="text-gray-600 mb-6">You need to be signed in to view your profile.</p>
          <Link href="/">
            <Button className="bg-[#D32F2F] hover:bg-[#B71C1C]">
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
        </Link>

        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={user.photoURL || ''} />
                  <AvatarFallback className="bg-[#D32F2F] text-white text-2xl font-semibold">
                    {user.displayName 
                      ? user.displayName.split(' ').map(n => n[0]).join('').slice(0, 2)
                      : user.email[0].toUpperCase()
                    }
                  </AvatarFallback>
                </Avatar>
                <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Profile Photo</DialogTitle>
                      <DialogDescription>
                        Choose a new profile photo to upload.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={uploading || uploadPhotoMutation.isPending}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">
                  {user.displayName || user.email.split('@')[0]}
                </h1>
                <p className="text-gray-600">{user.email}</p>
                <div className="flex items-center space-x-4 mt-2">
                  {user.isAdmin && (
                    <Badge className="bg-[#D32F2F]">Admin</Badge>
                  )}
                  <span className="text-sm text-gray-500">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Joined {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="businesses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="businesses">
              <Building className="h-4 w-4 mr-2" />
              My Businesses
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <Star className="h-4 w-4 mr-2" />
              My Reviews
            </TabsTrigger>
            <TabsTrigger value="claims">
              <User className="h-4 w-4 mr-2" />
              My Claims
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Businesses Tab */}
          <TabsContent value="businesses">
            <Card>
              <CardHeader>
                <CardTitle>My Businesses</CardTitle>
              </CardHeader>
              <CardContent>
                {businessesLoading ? (
                  <div className="text-center py-8">Loading businesses...</div>
                ) : userBusinesses && userBusinesses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userBusinesses.map((business: Business) => (
                      <Card key={business.id} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-4">
                          <h3 className="font-semibold text-lg mb-2">{business.name}</h3>
                          <p className="text-gray-600 mb-2">{business.category}</p>
                          <div className="flex items-center mb-2">
                            <MapPin className="h-4 w-4 text-gray-500 mr-1" />
                            <span className="text-sm text-gray-600">{business.city}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              {renderStars(business.avgRating)}
                              <span className="ml-2 text-sm text-gray-600">
                                ({business.reviewCount})
                              </span>
                            </div>
                            {business.verified && (
                              <Badge className="bg-[#388E3C]">Verified</Badge>
                            )}
                          </div>
                          <Link href={`/business/${business.id}`}>
                            <Button className="w-full mt-4" variant="outline">
                              View Details
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No businesses yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      You haven't added any businesses yet.
                    </p>
                    <Link href="/add-business">
                      <Button className="bg-[#D32F2F] hover:bg-[#B71C1C]">
                        Add Your First Business
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle>My Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                {reviewsLoading ? (
                  <div className="text-center py-8">Loading reviews...</div>
                ) : userReviews && userReviews.length > 0 ? (
                  <div className="space-y-6">
                    {userReviews.map((review: ReviewWithBusiness) => (
                      <Card key={review.id} className="border-l-4 border-l-[#D32F2F]">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <h3 className="font-semibold text-lg mr-3">
                                  {review.business.name}
                                </h3>
                                <div className="flex">
                                  {renderStars(review.rating)}
                                </div>
                              </div>
                              <p className="text-gray-600 mb-2">{review.business.category}</p>
                              {review.comment && (
                                <p className="text-gray-800 mb-3">{review.comment}</p>
                              )}
                              {review.photoUrl && (
                                <img 
                                  src={review.photoUrl} 
                                  alt="Review photo" 
                                  className="w-32 h-32 object-cover rounded-lg mb-3"
                                />
                              )}
                              <p className="text-sm text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditReview(review)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteReview(review.id)}
                                disabled={deleteReviewMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No reviews yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      You haven't written any reviews yet.
                    </p>
                    <Link href="/">
                      <Button className="bg-[#D32F2F] hover:bg-[#B71C1C]">
                        Browse Businesses
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Claims Tab */}
          <TabsContent value="claims">
            <Card>
              <CardHeader>
                <CardTitle>My Claims</CardTitle>
              </CardHeader>
              <CardContent>
                {claimsLoading ? (
                  <div className="text-center py-8">Loading claims...</div>
                ) : userClaims && userClaims.length > 0 ? (
                  <div className="space-y-6">
                    {userClaims.map((claim: ClaimWithBusiness) => (
                      <Card key={claim.id} className="border-l-4 border-l-[#D32F2F]">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center mb-2">
                                <h3 className="font-semibold text-lg mr-3">
                                  {claim.business.name}
                                </h3>
                                <Badge className={getStatusBadgeColor(claim.status)}>
                                  {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                                </Badge>
                              </div>
                              <p className="text-gray-600 mb-2">
                                {claim.business.category} • {claim.business.city}
                              </p>
                              <div className="mb-3">
                                <p className="text-sm text-gray-600 mb-2">Proof Document:</p>
                                <a 
                                  href={claim.proofUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  View Proof Document
                                </a>
                              </div>
                              <div className="text-sm text-gray-500 space-y-1">
                                <p>Submitted: {new Date(claim.submittedAt).toLocaleDateString()}</p>
                                {claim.reviewedAt && (
                                  <p>Reviewed: {new Date(claim.reviewedAt).toLocaleDateString()}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Link href={`/business/${claim.businessId}`}>
                                <Button size="sm" variant="outline">
                                  View Business
                                </Button>
                              </Link>
                              {claim.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteClaim(claim)}
                                  disabled={deleteClaimMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No claims yet
                    </h3>
                    <p className="text-gray-600 mb-4">
                      You haven't submitted any business claims yet.
                    </p>
                    <Link href="/">
                      <Button className="bg-[#D32F2F] hover:bg-[#B71C1C]">
                        Browse Businesses
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="border-b pb-6">
                  <h3 className="text-lg font-medium mb-4">Profile Information</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Display Name</Label>
                      <Input 
                        value={user.displayName || ''} 
                        placeholder="Enter your display name"
                        readOnly
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        Contact support to change your display name
                      </p>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={user.email} readOnly />
                      <p className="text-sm text-gray-500 mt-1">
                        Contact support to change your email
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-b pb-6">
                  <h3 className="text-lg font-medium mb-4">Account Actions</h3>
                  <div className="space-y-4">
                    <Button 
                      variant="outline" 
                      onClick={signOut}
                      className="w-full"
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4 text-red-600">Danger Zone</h3>
                  <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" className="w-full">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle className="flex items-center">
                          <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                          Delete Account
                        </DialogTitle>
                        <DialogDescription>
                          This action cannot be undone. This will permanently delete your 
                          account and remove all your data from our servers.
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => setDeleteDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={() => deleteAccountMutation.mutate()}
                          disabled={deleteAccountMutation.isPending}
                        >
                          {deleteAccountMutation.isPending ? 'Deleting...' : 'Delete Account'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Review Modal */}
      {selectedReview && (
        <ReviewForm
          open={editReviewOpen}
          onOpenChange={setEditReviewOpen}
          businessId={selectedReview.businessId}
          businessName={selectedReview.business.name}
          existingReview={selectedReview}
          isEdit={true}
        />
      )}

      {/* Delete Claim Confirmation Dialog */}
      <Dialog open={claimDeleteDialogOpen} onOpenChange={setClaimDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Delete Claim
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this claim for "{selectedClaim?.business.name}"? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setClaimDeleteDialogOpen(false);
                setSelectedClaim(null);
              }}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={confirmDeleteClaim}
              disabled={deleteClaimMutation.isPending}
            >
              {deleteClaimMutation.isPending ? 'Deleting...' : 'Delete Claim'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
