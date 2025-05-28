import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ReviewForm } from '@/components/review-form';
import { ClaimBusinessForm } from '@/components/claim-business-form';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Globe, 
  Mail,
  Star,
  Building,
  Edit,
  Clock
} from 'lucide-react';
import { Link, useLocation } from 'wouter';

export default function BusinessDetail() {
  const { t } = useTranslation();
  const params = useParams();
  const businessId = parseInt(params.id || '0');

  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [claimFormOpen, setClaimFormOpen] = useState(false);
  const [location, navigate] = useLocation();

  const { data: business, isLoading } = useQuery({
    queryKey: ['/api/businesses', businessId],
    enabled: businessId > 0,
  });

  const { data: reviews } = useQuery({
    queryKey: [`/api/businesses/${businessId}/reviews`],
    enabled: businessId > 0,
  });

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

  // Mock user and userClaims for testing
  const user = { id: 123, email: 'test@example.com' };
  const userClaims = [
    { businessId: business.id, userId: user.id, status: 'approved' }
  ];


  // Check if current user is the business owner (check both userId and approved claims)
  const isBusinessOwner = user && (
    business?.userId === user.id || 
    userClaims?.some((claim: any) => 
      claim.businessId === business?.id && 
      claim.status === 'approved' && 
      claim.userId === user.id
    )
  );

  const handleClaimBusiness = () => {
    // Handle the claim business logic here
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


                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{business.name}</h1>

                <p className="text-gray-600 text-lg mb-2">{business.category}</p>
                <div className="flex items-center text-gray-600 mb-2">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>{business.address}</span>
                </div>

                {business.description && (
                  <div className="mb-4">
                    <p className="text-gray-700">{business.description}</p>
                  </div>
                )}

                {business.hours && (
                  <div className="mb-4">
                    <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Opening Hours
                    </h4>
                    <p className="text-gray-600">{business.hours}</p>
                  </div>
                )}


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
                  <p className="text-gray-700 mb-6">{business.description}</p>
                )}

                {/* Photos */}
                {business.photos && business.photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {business.photos.slice(0, 6).map((photo: string, index: number) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`${business.name} photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ))}
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
                              className="w-full max-w-md h-48 object-cover rounded-lg"
                            />
                          )}
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
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-gray-900">{business.address}</p>
                      <p className="text-gray-600">{business.city}</p>
                    </div>
                  </div>

                  {business.phone && (
                    <div className="flex items-center">
                      <Phone className="h-5 w-5 text-gray-400 mr-3" />
                      <p className="text-gray-900">{business.phone}</p>
                    </div>
                  )}

                  {business.email && (
                    <div className="flex items-center">
                      <Mail className="h-5 w-5 text-gray-400 mr-3" />
                      <p className="text-gray-900">{business.email}</p>
                    </div>
                  )}

                  {business.website && (
                    <div className="flex items-center">
                      <Globe className="h-5 w-5 text-gray-400 mr-3" />
                      <a 
                        href={business.website} 
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
                  {/* Edit Business Info - Only visible to business owner */}
                  {isBusinessOwner && (
                    <Button
                      onClick={() => navigate(`/edit-business/${business.id}`)}
                      className="w-full bg-[#FF6F00] hover:bg-[#E65100]"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Business Info
                    </Button>
                  )}

                  {/* Claim Business - Only visible for unclaimed businesses */}
                  {!business.claimedBy && !isBusinessOwner && (
                    <Button 
                      onClick={() => setClaimFormOpen(true)}
                      variant="outline"
                      className="w-full border-[#D32F2F] text-[#D32F2F] hover:bg-red-50"
                    >
                      <Building className="h-4 w-4 mr-2" />
                      {t('business.claimBusiness')}
                    </Button>
                  )}

                  {/* If no actions available, show a message */}
                  {!isBusinessOwner && business.claimedBy && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      This business is already claimed and verified.
                    </p>
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
        businessId={business.id}
        businessName={business.name}
      />
    </div>
  );
}