import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { BusinessCard } from '@/components/business-card';
import { ReviewForm } from '@/components/review-form';
import { ClaimBusinessForm } from '@/components/claim-business-form';
import { SearchBar } from '@/components/search-bar';
import { 
  Utensils, 
  ShoppingBag, 
  Wrench, 
  Heart, 
  GraduationCap, 
  Car,
  ArrowRight,
  Plus,
  Building
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Star } from 'lucide-react';

const categories = [
  { name: 'category.restaurants', icon: Utensils, value: 'restaurants' },
  { name: 'category.shopping', icon: ShoppingBag, value: 'shopping' },
  { name: 'category.services', icon: Wrench, value: 'services' },
  { name: 'category.health', icon: Heart, value: 'health' },
  { name: 'category.education', icon: GraduationCap, value: 'education' },
  { name: 'category.automotive', icon: Car, value: 'automotive' },
];

export default function Home() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [claimFormOpen, setClaimFormOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<{ id: number; name: string } | null>(null);

  // Fetch featured businesses
  const { data: featuredBusinesses, isLoading: businessesLoading } = useQuery({
    queryKey: ['/api/businesses/featured'],
  });

  // Fetch recent reviews
  const { data: recentReviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['/api/reviews/recent'],
  });

  const handleSearch = (query: string, location: string) => {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (location) params.set('city', location);
    
    navigate(`/search?${params.toString()}`);
  };

  const handleCategorySelect = (category: string) => {
    navigate(`/search?category=${category}`);
  };

  const handleWriteReview = (businessId: number) => {
    const business = featuredBusinesses?.find((b: any) => b.id === businessId);
    if (business) {
      setSelectedBusiness({ id: businessId, name: business.name });
      setReviewFormOpen(true);
    }
  };

  const handleClaimBusiness = (businessId: number) => {
    const business = featuredBusinesses?.find((b: any) => b.id === businessId);
    if (business) {
      setSelectedBusiness({ id: businessId, name: business.name });
      setClaimFormOpen(true);
    }
  };

  const handleViewDetails = (businessId: number) => {
    navigate(`/business/${businessId}`);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#D32F2F] to-red-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">{t('hero.title')}</h2>
          <p className="text-xl mb-8 text-red-100">{t('hero.subtitle')}</p>
          
          <div className="max-w-4xl mx-auto">
            <SearchBar onSearch={handleSearch} />
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
            {t('categories.title')}
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category) => {
              const IconComponent = category.icon;
              return (
                <div
                  key={category.value}
                  className="text-center group cursor-pointer"
                  onClick={() => handleCategorySelect(category.value)}
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-[#D32F2F] group-hover:text-white transition-colors">
                    <IconComponent className="h-8 w-8 text-gray-600 group-hover:text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {t(category.name)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Businesses Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900">{t('business.featured')}</h3>
            <Link href="/search">
              <Button variant="link" className="text-[#D32F2F] hover:text-red-700 font-medium">
                {t('business.viewAll')} <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
          
          {businessesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
                  <div className="h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredBusinesses?.map((business: any) => (
                <BusinessCard
                  key={business.id}
                  business={business}
                  onWriteReview={handleWriteReview}
                  onViewDetails={handleViewDetails}
                  onClaimBusiness={handleClaimBusiness}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Recent Reviews Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-gray-900 text-center mb-12">
            {t('reviews.recent')}
          </h3>
          
          {reviewsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="p-6 animate-pulse">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="ml-4 flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {recentReviews?.map((review: any) => (
                <Card key={review.id} className="bg-gray-50">
                  <CardContent className="p-6">
                    <div className="flex items-center mb-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-[#D32F2F] text-white font-semibold">
                          {review.user.displayName 
                            ? review.user.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
                            : review.user.email[0].toUpperCase()
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div className="ml-4">
                        <h5 className="font-semibold text-gray-900">
                          {review.user.displayName || review.user.email.split('@')[0]}
                        </h5>
                        <div className="flex text-[#FF6F00] text-sm">
                          {renderStars(review.rating)}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-3 line-clamp-3">
                      {review.comment || "Great experience!"}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Business Review</span>
                      <span>{new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-16 bg-gradient-to-r from-[#388E3C] to-green-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold mb-6">{t('business.addYourBusiness')}</h3>
          <p className="text-xl mb-8 text-green-100">{t('business.joinThousands')}</p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/add-business">
              <Button className="bg-white text-[#388E3C] px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition-colors">
                <Plus className="mr-2 h-5 w-5" />
                {t('business.addBusiness')}
              </Button>
            </Link>
            <Button
              variant="outline"
              className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white hover:text-[#388E3C] transition-colors"
            >
              <Building className="mr-2 h-5 w-5" />
              Claim Your Business
            </Button>
          </div>
        </div>
      </section>

      {/* Review Form Modal */}
      {selectedBusiness && (
        <ReviewForm
          open={reviewFormOpen}
          onOpenChange={setReviewFormOpen}
          businessId={selectedBusiness.id}
          businessName={selectedBusiness.name}
        />
      )}

      {/* Claim Form Modal */}
      {selectedBusiness && (
        <ClaimBusinessForm
          open={claimFormOpen}
          onOpenChange={setClaimFormOpen}
          businessId={selectedBusiness.id}
          businessName={selectedBusiness.name}
        />
      )}
    </div>
  );
}
