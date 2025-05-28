
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface ReportReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewId: number;
  businessId: number;
}

export function ReportReviewDialog({ open, onOpenChange, reviewId, businessId }: ReportReviewDialogProps) {
  const [reason, setReason] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const reportMutation = useMutation({
    mutationFn: async (reportData: { userId: number; reason: string }) => {
      const response = await fetch(`/api/reviews/${reviewId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to report review');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/businesses/${businessId}/reviews`] });
      onOpenChange(false);
      setReason('');
      toast({
        title: "Report Submitted",
        description: "Thank you for reporting this review. We will investigate it.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Error",
        description: 'Please sign in to report a review',
        variant: 'destructive',
      });
      return;
    }

    if (!reason) {
      toast({
        title: "Error",
        description: 'Please select a reason for reporting',
        variant: 'destructive',
      });
      return;
    }

    reportMutation.mutate({ userId: user.id!, reason });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Review</DialogTitle>
          <DialogDescription>
            Please select the reason for reporting this review. All reports are reviewed by our moderation team.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3">
            <Label>Reason for reporting:</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="verbal_abuse" id="verbal_abuse" />
                <Label htmlFor="verbal_abuse">Verbal abuse or harassment</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nsfw" id="nsfw" />
                <Label htmlFor="nsfw">NSFW content</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="spam" id="spam" />
                <Label htmlFor="spam">Spam or fake review</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other">Other violation</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              disabled={!reason || reportMutation.isPending}
              variant="destructive"
              className="flex-1"
            >
              {reportMutation.isPending ? 'Reporting...' : 'Report Review'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
