import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin } from 'lucide-react';
import { Business } from '@shared/schema';

interface BusinessCardProps {
  business: Business;
  onWriteReview?: (businessId: number) => void;
  onViewDetails?: (businessId: number) => void;
  onClaimBusiness?: (businessId: number) => void;
}

export function BusinessCard({ 
  business, 
  onWriteReview, 
  onViewDetails, 
  onClaimBusiness 
}: BusinessCardProps) {
  const { t } = useTranslation();

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

  const defaultPhoto = business.photos?.[0] || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=200&fit=crop';

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-48 overflow-hidden">
        <img
          src={defaultPhoto}
          alt={business.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-xl font-semibold text-gray-900 line-clamp-1">
            {business.name}
          </h4>
          <div className="flex items-center space-x-2">
            {business.verified && (
              <Badge className="bg-[#388E3C] text-white">
                {t('business.verified')}
              </Badge>
            )}
            {!business.claimedBy && (
              <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                {t('business.pending')}
              </Badge>
            )}
          </div>
        </div>
        
        <p className="text-gray-600 mb-3 line-clamp-1">{business.category}</p>
        
        {/* Rating */}
        <div className="flex items-center mb-3">
          <div className="flex">
            {renderStars(business.avgRating)}
          </div>
          <span className="ml-2 text-gray-600 text-sm">
            {business.avgRating.toFixed(1)} ({business.reviewCount} {t('reviews.rating')})
          </span>
        </div>
        
        {/* Location */}
        <div className="flex items-center text-gray-600 mb-4">
          <MapPin className="h-4 w-4 mr-2" />
          <span className="text-sm line-clamp-1">
            {business.address}, {business.city}
          </span>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            onClick={() => onWriteReview?.(business.id)}
            className="flex-1 bg-[#D32F2F] text-white hover:bg-[#B71C1C]"
            size="sm"
          >
            {t('business.writeReview')}
          </Button>
          
          {/* Only show claim button if onClaimBusiness is provided and business is not claimed */}
          {onClaimBusiness && !business.claimedBy ? (
            <Button
              onClick={() => onClaimBusiness(business.id)}
              variant="outline"
              className="flex-1 border-[#D32F2F] text-[#D32F2F] hover:bg-red-50"
              size="sm"
            >
              {t('business.claimBusiness')}
            </Button>
          ) : (
            <Button
              onClick={() => onViewDetails?.(business.id)}
              variant="outline"
              className="flex-1"
              size="sm"
            >
              {t('business.viewDetails')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
