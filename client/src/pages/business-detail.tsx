import { useParams } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ReviewForm } from '@/components/review-form';
import { ClaimBusinessForm } from '@/components/claim-business-form';
import { ReportReviewDialog } from '@/components/report-review-dialog';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Globe, 
  Mail,
  Star,
  Building,
  Edit,
  Clock,
  ThumbsUp,
  Flag
} from 'lucide-react';
import { Link } from 'wouter';

export default function BusinessDetail() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const params = useParams();
  const identifier = params.identifier || '';
  
  console.log('Business detail identifier:', identifier);

  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [claimFormOpen, setClaimFormOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<number | null>(null);

  // Parse business ID from identifier
  const businessIdInt = /^\d+$/.test(identifier) ? parseInt(identifier) : 0;

  // Fetch business data using the identifier (could be ID or slug)
  const { data: business, isLoading, error } = useQuery({
    queryKey: ['business', identifier],
    queryFn: async () => {
      console.log('Fetching business with identifier:', identifier);
      const response = await fetch(`/api/businesses/${identifier}`);
      const data = await response.json();
      console.log('Business data received:', data);
      return data;
    },
    enabled: !!identifier,
  });

  // Early return after all hooks are called
  if (!identifier) {
    return <div>Invalid business ID</div>;
  }

  // Get reviews for the business
  const { data: reviews } = useQuery({
    queryKey: ['reviews', business?.id],
    queryFn: () => fetch(`/api/businesses/${business?.id}/reviews?userId=${user?.id || ''}`).then(res => res.json()),
    enabled: !!business?.id,
  });

  // Get current user data if authenticated
  const { data: currentUser } = useQuery({
    queryKey: ['/api/users/uid', user?.uid],
    queryFn: () => fetch(`/api/users/uid/${user?.uid}`).then(res => res.json()),
    enabled: !!user?.uid,
  });

  // Get user's claims if authenticated
  const { data: userClaims } = useQuery({
    queryKey: [`/api/users/${currentUser?.id}/claims`],
    queryFn: () => fetch(`/api/users/${currentUser?.id}/claims`).then(res => res.json()),
    enabled: !!currentUser?.id,
  });

  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: async ({ reviewId, userId }: { reviewId: number; userId: number }) => {
      const response = await fetch(`/api/reviews/${reviewId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to like review');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessIdInt}/reviews`] });
    },
  });

  const handleLikeReview = (reviewId: number) => {
    if (!user || !currentUser) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like reviews",
        variant: "destructive",
      });
      return;
    }
    likeMutation.mutate({ reviewId, userId: currentUser.id });
  };

  const handleReportReview = (reviewId: number) => {
    setSelectedReviewId(reviewId);
    setReportDialogOpen(true);
  };

  const renderStars = (rating: number) => {
    const safeRating = rating || 0;
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${
          i < Math.floor(safeRating) 
            ? 'fill-[#FF6F00] text-[#FF6F00]' 
            : i < safeRating 
              ? 'fill-[#FF6F00]/50 text-[#FF6F00]' 
              : 'text-gray-300'
        }`}
      />
    ));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="animate-pulse">
            <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/2 sm:w-1/4 mb-4 sm:mb-6"></div>
            <div className="h-48 sm:h-64 bg-gray-200 rounded mb-4 sm:mb-6"></div>
            <div className="h-5 sm:h-6 bg-gray-200 rounded mb-3 sm:mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-full sm:w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Business not found</h1>
          <Link href="/">
            <Button className="w-full sm:w-auto">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Check if current user is the business owner
  const isBusinessOwner = currentUser && business && (
    // Check if user created the business
    business.createdBy === currentUser.id ||
    // Check if user has verified ownership through claims
    userClaims?.some((claim: any) => 
      claim.businessId === business.id && 
      claim.status === 'approved' && 
      claim.userId === currentUser.id
    ) ||
    // Check if user is the verified owner
    (business.verified && business.owner && business.owner.id === currentUser.id) ||
    // Check if user is directly marked as claimedBy
    (business.claimedBy === currentUser.id)
  );

  // Helper function to mask owner name
  const maskOwnerName = (displayName: string | null, email: string) => {
    if (displayName) {
      const nameParts = displayName.split(' ');
      if (nameParts.length >= 2) {
        return `${nameParts[0]} ${nameParts[1][0]}.`;
      }
      return nameParts[0];
    }
    // Fallback to email username
    return email.split('@')[0];
  };

  // Helper function to format working hours
  const formatWorkingHours = (hours: any) => {
    if (typeof hours === 'string') {
      return hours;
    }
    if (typeof hours === 'object' && hours !== null) {
      return Object.entries(hours).map(([day, time]) => `${day}: ${time}`).join(', ');
    }
    return 'Contact business for hours';
  };

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Business Header */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{business.name}</h1>
                    <p className="text-gray-600 text-lg mb-3">{business.category}</p>
                  </div>

                  {/* Business Status Badges */}
                  <div className="flex flex-col items-end space-y-2">
                    {business.verified ? (
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        ✓ Verified Business
                      </Badge>
                    ) : business.claimedBy ? (
                      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                        Claim Pending Verification
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700 border-gray-300">
                        Unverified Business
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Business Owner Info - Only show if business is verified and has an owner */}
                {business.verified && business.owner && (
                  <div className="flex items-center text-gray-600 mb-4">
                    <Building className="h-5 w-5 mr-2" />
                    <span className="font-medium">
                      Owned by {maskOwnerName(business.owner.displayName, business.owner.email)}
                    </span>
                  </div>
                )}

                {/* Location */}
                <div className="flex items-center text-gray-600 mb-4">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>{business.address}{business.city ? `, ${business.city}` : ''}</span>
                </div>

                {/* Rating */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="flex text-[#FF6F00]">
                    {renderStars(business?.avgRating || 0)}
                  </div>
                  <span className="text-xl font-bold">{(business?.avgRating || 0).toFixed(1)}</span>
                  <span className="text-gray-600">({business?.reviewCount || 0} reviews)</span>
                </div>

                {/* Description */}
                {business.description && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2">About</h4>
                    <p className="text-gray-700">{business.description}</p>
                  </div>
                )}

                {/* Working Hours */}
                {(business.hours || business.openingHours) && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Working Hours
                    </h4>
                    <p className="text-gray-600">{formatWorkingHours(business.hours || business.openingHours)}</p>
                  </div>
                )}

                {/* Photos */}
                {business.photos && business.photos.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Photos</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {business.photos.slice(0, 6).map((photo: string, index: number) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`${business.name} photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Reviews</h2>
                  <Button 
                    onClick={() => setReviewFormOpen(true)}
                    className="bg-[#D32F2F] hover:bg-[#B71C1C]"
                  >
                    {t('reviews.writeReview')}
                  </Button>
                </div>

                <div className="space-y-6">
                  {reviews?.map((review: any) => (
                    <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
                      <div className="flex items-start space-x-4">
                        <Avatar className="w-12 h-12">
                          <AvatarFallback className="bg-[#D32F2F] text-white font-semibold">
                            {review.user.displayName 
                              ? review.user.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
                              : review.user.email[0].toUpperCase()
                            }
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">
                              {review.user.displayName || review.user.email.split('@')[0]}
                            </h4>
                            <span className="text-sm text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex mb-3">
                            {renderStars(review.rating)}
                          </div>

                          {review.comment && (
                            <p className="text-gray-700 mb-3">{review.comment}</p>
                          )}

                          {review.photoUrl && (
                            <img
                              src={review.photoUrl}
                              alt="Review photo"
                              className="w-full max-w-md h-48 object-cover rounded-lg mb-3"
                            />
                          )}

                          {/* Like and Report buttons */}
                          <div className="flex items-center space-x-4 mt-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLikeReview(review.id)}
                              disabled={!currentUser || likeMutation.isPending}
                              className={`flex items-center space-x-1 hover:bg-gray-100 ${review.isLikedByUser ? 'text-blue-600' : 'text-gray-500'}`}
                            >
                              <ThumbsUp className={`h-4 w-4 ${review.isLikedByUser ? 'fill-current' : ''}`} />
                              <span>{review.likeCount || 0}</span>
                            </Button>

                            {user && currentUser && (currentUser.id !== review.userId) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReportReview(review.id)}
                                className="flex items-center space-x-1 text-gray-500 hover:text-red-600 hover:bg-gray-100"
                              >
                                <Flag className="h-4 w-4" />
                                <span>Report</span>
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {(!reviews || reviews.length === 0) && (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact Info */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>

                <div className="space-y-3">
                  <div className="flex items-start">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <p className="text-gray-900">{business.address}</p>
                      {business.city && <p className="text-gray-600">{business.city}</p>}
                    </div>
                  </div>

                  {business.phone && (
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-3" />
                      <a href={`tel:${business.phone}`} className="text-gray-900 hover:text-[#D32F2F]">
                        {business.phone}
                      </a>
                    </div>
                  )}

                  {business.email && (
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-3" />
                      <a href={`mailto:${business.email}`} className="text-gray-900 hover:text-[#D32F2F]">
                        {business.email}
                      </a>
                    </div>
                  )}

                  {business.website && (
                    <div className="flex items-center">
                      <Globe className="h-5 w-5 text-gray-400 mr-3" />
                      <a 
                        href={business.website.startsWith('http') ? business.website : `https://${business.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#D32F2F] hover:underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>

                <div className="space-y-3">
                  {/* Edit Business Info - Visible to all business owners */}
                  {isBusinessOwner && (
                    <Link href={`/add-business?edit=${business.id}`}>
                      <Button className="w-full bg-[#FF6F00] hover:bg-[#E65100]">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Business Info
                      </Button>
                    </Link>
                  )}

                  {/* Claim Business - Only show if business is not verified/claimed and user is logged in */}
                  {user && !isBusinessOwner && (!business.verified && !business.claimedBy) && (
                    <Button 
                      onClick={() => setClaimFormOpen(true)}
                      variant="outline"
                      className="w-full border-[#D32F2F] text-[#D32F2F] hover:bg-red-50"
                    >
                      <Building className="h-4 w-4 mr-2" />
                      Claim This Business
                    </Button>
                  )}

                  {/* Status messages */}
                  {business.verified && !isBusinessOwner && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-700 text-center">
                        ✓ This business is verified and managed by its owner.
                      </p>
                    </div>
                  )}

                  {business.claimedBy && !business.verified && !isBusinessOwner && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-yellow-700 text-center">
                        ⏳ This business has been claimed and is pending verification.
                      </p>
                    </div>
                  )}

                  {!user && (!business.verified || !business.claimedBy) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-sm text-blue-700 text-center">
                        Please sign in to claim this business if you are the owner.
                      </p>
                    </div>
                  )}

                  {user && (!business.verified || !business.claimedBy) && !isBusinessOwner && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-600 text-center">
                        Are you the owner? Click "Claim This Business" to verify your ownership.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Review Form Modal */}
      <ReviewForm
        open={reviewFormOpen}
        onOpenChange={setReviewFormOpen}
        businessId={business.id}
        businessName={business.name}
      />

      {/* Claim Form Modal */}
      <ClaimBusinessForm
        open={claimFormOpen}
        onOpenChange={setClaimFormOpen}
        businessId={businessIdInt}
        businessName={business.name}
      />

      {/* Report Review Dialog */}
      {selectedReviewId && (
        <ReportReviewDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          reviewId={selectedReviewId}
          businessId={businessIdInt}
        />
      )}
    </div>
  );
}