import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, MapPin } from 'lucide-react';
import { Business } from '@shared/schema';
import { Building } from 'lucide-react'; // Added Building icon for placeholder

interface BusinessCardProps {
  business: Business;
  onWriteReview?: (businessId: number) => void;
  onViewDetails?: (businessId: number | string) => void;
  onClaimBusiness?: (businessId: number) => void;
}

export function BusinessCard({ business, onWriteReview, onClaimBusiness }: BusinessCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="aspect-video md:aspect-video bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center">
          <Building className="h-8 w-8 md:h-12 md:w-12 text-gray-400" />
        </div>

        <div className="p-4 md:p-6">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 line-clamp-2 pr-2">
              {business.name}
            </h3>
            {business.verified && (
              <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800 shrink-0 text-xs">
                {t('business.verified')}
              </Badge>
            )}
          </div>

          <p className="text-sm md:text-base text-gray-600 mb-3">{business.category}</p>

          <div className="flex items-center mb-3 md:mb-4">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 md:h-4 md:w-4 ${
                    i < Math.floor(business.avgRating || 0)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="ml-2 text-xs md:text-sm text-gray-600">
              ({business.reviewCount || 0} {t('business.reviews')})
            </span>
          </div>

          <div className="flex items-center text-gray-600 mb-3 md:mb-4">
            <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-1" />
            <span className="text-xs md:text-sm">{business.city}</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onWriteReview?.()}
              className="flex-1 text-xs md:text-sm h-8 md:h-9"
            >
              {t('business.writeReview')}
            </Button>
            {!business.verified && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onClaimBusiness?.()}
                className="flex-1 text-xs md:text-sm h-8 md:h-9"
              >
                {t('business.claim')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}