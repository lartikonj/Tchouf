import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
  existingReview?: any;
}

export function ReviewForm({ open, onOpenChange, businessId, businessName, existingReview }: ReviewFormProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { uploadReviewPhoto, uploading } = useFirebaseStorage();
  const queryClient = useQueryClient();

  const isEdit = !!existingReview;

  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [existingPhotoUrl, setExistingPhotoUrl] = useState(existingReview?.photoUrl || '');

  const createReviewMutation = useMutation({
    mutationFn: async (reviewData: any) => {
      const url = isEdit ? `/api/reviews/${existingReview?.id}` : '/api/reviews';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEdit ? 'update' : 'create'} review`);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews/recent'] });
      queryClient.invalidateQueries({ queryKey: ['/api/businesses/featured'] });
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/reviews`] });
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/reviews`] });
      }
      onOpenChange(false);
      if (!isEdit) {
        setRating(0);
        setComment('');
        setPhoto(null);
        setExistingPhotoUrl('');
      }
      toast({
        title: "Success",
        description: `Review ${isEdit ? 'updated' : 'submitted'} successfully!`,
      });
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
    setExistingPhotoUrl('');
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
      let photoUrl = existingPhotoUrl;
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
          <DialogTitle>
          {isEdit ? 'Edit Your Review' : `Write a Review for ${businessName}`}
        </DialogTitle>
        <DialogDescription>
          {isEdit 
            ? 'Update your review to reflect your latest experience.'
            : 'Share your experience with this business to help others make informed decisions.'
          }
        </DialogDescription>
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
             {(photo || existingPhotoUrl) && (
              <div className="mt-2">
                <img 
                  src={photo ? URL.createObjectURL(photo) : existingPhotoUrl} 
                  alt="Preview" 
                  className="w-32 h-32 object-cover rounded-lg"
                />
                {existingPhotoUrl && !photo && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setExistingPhotoUrl('')}
                  >
                    Remove Photo
                  </Button>
                )}
              </div>
            )}
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
            className="bg-[#D32F2F] hover:bg-[#B71C1C]"
          >
            {createReviewMutation.isPending || uploading 
              ? (isEdit ? 'Updating...' : 'Submitting...') 
              : (isEdit ? 'Update Review' : 'Submit Review')
            }
          </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}