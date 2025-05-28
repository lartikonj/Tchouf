import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Building, 
  User,
  FileText,
  Calendar
} from 'lucide-react';
import { Link } from 'wouter';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch pending claims
  const { data: pendingClaims, isLoading } = useQuery({
    queryKey: ['/api/claims/pending'],
  });

  const updateClaimMutation = useMutation({
    mutationFn: async ({ claimId, status }: { claimId: number; status: 'approved' | 'rejected' }) => {
      return apiRequest('PATCH', `/api/claims/${claimId}/status`, { status });
    },
    onSuccess: (_, { status }) => {
      toast({
        title: t('common.success'),
        description: `Claim ${status} successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/claims/pending'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleApproveClaim = (claimId: number) => {
    updateClaimMutation.mutate({ claimId, status: 'approved' });
  };

  const handleRejectClaim = (claimId: number) => {
    updateClaimMutation.mutate({ claimId, status: 'rejected' });
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">Please sign in to access the admin dashboard.</p>
            <Link href="/">
              <Button>Go Home</Button>
            </Link>
          </CardContent>
        </Card>
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

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-gray-600">Manage business claims and verifications</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Pending Claims</h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {pendingClaims?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total Businesses</h3>
                  <p className="text-2xl font-bold text-gray-900">--</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
                  <p className="text-2xl font-bold text-gray-900">--</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Claims */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Pending Business Claims
            </CardTitle>
            <p className="text-gray-600">
              Review and approve business ownership claims
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-6 animate-pulse">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="h-6 bg-gray-200 rounded mb-2 w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded mb-4 w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                      <div className="flex space-x-2">
                        <div className="w-20 h-8 bg-gray-200 rounded"></div>
                        <div className="w-20 h-8 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingClaims && pendingClaims.length > 0 ? (
              <div className="space-y-6">
                {pendingClaims.map((claim: any) => (
                  <div
                    key={claim.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Business Info */}
                        <div className="flex items-center mb-4">
                          <Building className="h-5 w-5 text-gray-400 mr-2" />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {claim.business.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {claim.business.category} • {claim.business.city}
                            </p>
                          </div>
                        </div>

                        {/* User Info */}
                        <div className="flex items-center mb-4">
                          <Avatar className="w-8 h-8 mr-3">
                            <AvatarFallback className="bg-[#D32F2F] text-white text-sm">
                              {claim.user.displayName 
                                ? claim.user.displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)
                                : claim.user.email[0].toUpperCase()
                              }
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-gray-900">
                              {claim.user.displayName || claim.user.email.split('@')[0]}
                            </p>
                            <p className="text-sm text-gray-600">{claim.user.email}</p>
                          </div>
                        </div>

                        {/* Claim Details */}
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-gray-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            Submitted: {new Date(claim.submittedAt).toLocaleDateString()}
                          </div>
                          
                          {claim.proofUrl && (
                            <div className="flex items-center text-sm text-gray-600">
                              <FileText className="h-4 w-4 mr-2" />
                              <a 
                                href={claim.proofUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[#D32F2F] hover:underline"
                              >
                                View Proof Document
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Status */}
                        <div className="mt-4">
                          <Badge 
                            variant="outline" 
                            className="border-yellow-500 text-yellow-700"
                          >
                            {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                          </Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-3 ml-6">
                        <Button
                          onClick={() => handleApproveClaim(claim.id)}
                          disabled={updateClaimMutation.isPending}
                          className="bg-[#388E3C] hover:bg-green-700 text-white"
                          size="sm"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleRejectClaim(claim.id)}
                          disabled={updateClaimMutation.isPending}
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Pending Claims
                </h3>
                <p className="text-gray-600">
                  All business claims have been processed. New claims will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
