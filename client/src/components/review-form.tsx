import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Star, Upload } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useFirebaseStorage } from '@/hooks/use-firebase-storage';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ReviewFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: number;
  businessName: string;
}

export function ReviewForm({ open, onOpenChange, businessId, businessName }: ReviewFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadReviewPhoto, uploading } = useFirebaseStorage();
  const queryClient = useQueryClient();
  
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);

  const createReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      return apiRequest('POST', '/api/reviews', reviewData);
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: 'Review submitted successfully!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/businesses', businessId] });
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/reviews`] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/recent'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setRating(0);
    setHoveredRating(0);
    setComment('');
    setPhoto(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: t('common.error'),
        description: 'Please sign in to submit a review',
        variant: 'destructive',
      });
      return;
    }

    if (rating === 0) {
      toast({
        title: t('common.error'),
        description: 'Please select a rating',
        variant: 'destructive',
      });
      return;
    }

    try {
      let photoUrl = '';
      if (photo) {
        photoUrl = await uploadReviewPhoto(photo);
      }

      const reviewData = {
        businessId,
        userId: user.id!,
        rating,
        comment,
        photoUrl: photoUrl || undefined,
      };

      createReviewMutation.mutate(reviewData);
    } catch (error) {
      // Error handled by uploadReviewPhoto
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1;
      return (
        <Star
          key={i}
          className={`h-8 w-8 cursor-pointer transition-colors ${
            starValue <= (hoveredRating || rating)
              ? 'fill-[#FF6F00] text-[#FF6F00]'
              : 'text-gray-300 hover:text-[#FF6F00]'
          }`}
          onClick={() => setRating(starValue)}
          onMouseEnter={() => setHoveredRating(starValue)}
          onMouseLeave={() => setHoveredRating(0)}
        />
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('reviews.writeReview')}</DialogTitle>
          <p className="text-muted-foreground">{businessName}</p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>{t('reviews.rating.label')}</Label>
            <div className="flex space-x-1">
              {renderStars()}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">{t('reviews.comment')}</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo">Photo (optional)</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('photo')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {photo ? photo.name : 'Add Photo'}
              </Button>
            </div>
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {t('form.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={rating === 0 || createReviewMutation.isPending || uploading}
              className="flex-1 bg-[#D32F2F] hover:bg-[#B71C1C]"
            >
              {t('reviews.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
