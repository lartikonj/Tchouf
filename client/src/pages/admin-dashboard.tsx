import { useState } from 'react';
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
  Calendar,
  Edit
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Link } from 'wouter';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for business management
  const [businessFilter, setBusinessFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingBusiness, setEditingBusiness] = useState<any>(null);
  const [editFormOpen, setEditFormOpen] = useState(false);

  // Fetch pending claims
  const { data: pendingClaims, isLoading } = useQuery({
    queryKey: ['/api/claims/pending'],
  });

  // Fetch all businesses
  const { data: allBusinesses, isLoading: businessesLoading } = useQuery({
    queryKey: ['/api/businesses'],
  });

  // Fetch business stats
  const { data: businessStats } = useQuery({
    queryKey: ['/api/businesses'],
    select: (data) => ({
      total: data?.length || 0,
      verified: data?.filter((b: any) => b.verified).length || 0,
    }),
  });

  // Filter businesses based on selected filters
  const filteredBusinesses = allBusinesses?.filter((business: any) => {
    const statusMatch = businessFilter === 'all' || 
      (businessFilter === 'verified' && business.verified) ||
      (businessFilter === 'pending' && !business.verified);
    
    const categoryMatch = categoryFilter === 'all' || 
      business.category.toLowerCase() === categoryFilter.toLowerCase();
    
    return statusMatch && categoryMatch;
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

  const businessActionMutation = useMutation({
    mutationFn: async ({ action, businessId, data }: { 
      action: 'delete' | 'update'; 
      businessId: number; 
      data?: any 
    }) => {
      if (action === 'delete') {
        return apiRequest('DELETE', `/api/businesses/${businessId}`);
      } else {
        return apiRequest('PATCH', `/api/businesses/${businessId}`, data);
      }
    },
    onSuccess: (_, { action }) => {
      toast({
        title: t('common.success'),
        description: `Business ${action}d successfully!`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/businesses'] });
      if (action === 'update') {
        setEditFormOpen(false);
        setEditingBusiness(null);
      }
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

  const handleEditBusiness = (business: any) => {
    setEditingBusiness(business);
    setEditFormOpen(true);
  };

  const handleDeleteBusiness = (businessId: number) => {
    if (confirm('Are you sure you want to delete this business? This action cannot be undone.')) {
      businessActionMutation.mutate({ action: 'delete', businessId });
    }
  };

  const handleUpdateBusiness = (data: any) => {
    if (editingBusiness) {
      businessActionMutation.mutate({ 
        action: 'update', 
        businessId: editingBusiness.id, 
        data 
      });
    }
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

  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold mb-4 text-red-600">Admin Access Required</h1>
            <p className="text-gray-600 mb-4">You don't have permission to access the admin dashboard.</p>
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
                  <p className="text-2xl font-bold text-gray-900">
                    {businessStats?.total || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-sm font-medium text-gray-500">Verified Businesses</h3>
                  <p className="text-2xl font-bold text-gray-900">
                    {businessStats?.verified || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Business Management */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Business Management
            </CardTitle>
            <p className="text-gray-600">
              View, edit, and manage all businesses
            </p>
          </CardHeader>

          <CardContent className="p-6">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Select value={businessFilter} onValueChange={setBusinessFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Businesses</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="restaurants">Restaurants</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="automotive">Automotive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Business List */}
            {businessesLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="border border-gray-200 rounded-lg p-6 animate-pulse">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="h-6 bg-gray-200 rounded mb-2 w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded mb-4 w-1/2"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      </div>
                      <div className="flex space-x-2">
                        <div className="w-16 h-8 bg-gray-200 rounded"></div>
                        <div className="w-16 h-8 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredBusinesses && filteredBusinesses.length > 0 ? (
              <div className="space-y-4">
                {filteredBusinesses.map((business: any) => (
                  <div
                    key={business.id}
                    className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 mr-3">
                            {business.name}
                          </h3>
                          <Badge 
                            variant={business.verified ? "default" : "outline"}
                            className={business.verified ? "bg-[#388E3C] text-white" : "border-yellow-500 text-yellow-700"}
                          >
                            {business.verified ? "Verified" : "Pending"}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                          <div>
                            <p><strong>Category:</strong> {business.category}</p>
                            <p><strong>City:</strong> {business.city}</p>
                            <p><strong>Phone:</strong> {business.phone || 'N/A'}</p>
                          </div>
                          <div>
                            <p><strong>Rating:</strong> {business.avgRating?.toFixed(1) || 'No ratings'} ({business.reviewCount || 0} reviews)</p>
                            <p><strong>Created:</strong> {new Date(business.createdAt).toLocaleDateString()}</p>
                            <p><strong>Claimed:</strong> {business.claimedBy ? 'Yes' : 'No'}</p>
                          </div>
                        </div>

                        {business.description && (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {business.description}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex space-x-2 ml-6">
                        <Link href={`/business/${business.id}`}>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        </Link>
                        <Button
                          onClick={() => handleEditBusiness(business)}
                          variant="outline"
                          size="sm"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDeleteBusiness(business.id)}
                          disabled={businessActionMutation.isPending}
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No businesses found
                </h3>
                <p className="text-gray-600">
                  No businesses match the current filters.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

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

      {/* Edit Business Dialog */}
      <Dialog open={editFormOpen} onOpenChange={setEditFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Business Information</DialogTitle>
          </DialogHeader>
          
          {editingBusiness && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const data = {
                  name: formData.get('name'),
                  description: formData.get('description'),
                  category: formData.get('category'),
                  phone: formData.get('phone'),
                  website: formData.get('website'),
                  address: formData.get('address'),
                  city: formData.get('city'),
                  openingHours: formData.get('openingHours'),
                  verified: formData.get('verified') === 'on',
                };
                handleUpdateBusiness(data);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Business Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editingBusiness.name}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select name="category" defaultValue={editingBusiness.category}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="restaurants">Restaurants</SelectItem>
                      <SelectItem value="shopping">Shopping</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="health">Health</SelectItem>
                      <SelectItem value="education">Education</SelectItem>
                      <SelectItem value="automotive">Automotive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  defaultValue={editingBusiness.description}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    defaultValue={editingBusiness.phone}
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    defaultValue={editingBusiness.website}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    defaultValue={editingBusiness.address}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    name="city"
                    defaultValue={editingBusiness.city}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="openingHours">Opening Hours</Label>
                <Textarea
                  id="openingHours"
                  name="openingHours"
                  defaultValue={editingBusiness.openingHours}
                  rows={2}
                  placeholder="e.g., Mon-Fri: 9:00-18:00, Sat: 10:00-16:00"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="verified"
                  name="verified"
                  defaultChecked={editingBusiness.verified}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="verified">Verified Business</Label>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={businessActionMutation.isPending}
                  className="bg-[#D32F2F] hover:bg-[#B71C1C]"
                >
                  {businessActionMutation.isPending ? 'Updating...' : 'Update Business'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
