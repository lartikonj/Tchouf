import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { SearchBar } from '@/components/search-bar';
import { BusinessCard } from '@/components/business-card';
import { ReviewForm } from '@/components/review-form';
import { ClaimBusinessForm } from '@/components/claim-business-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Filter, MapPin, Search } from 'lucide-react';
import { Link } from 'wouter';

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'restaurants', label: 'Restaurants' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'services', label: 'Services' },
  { value: 'health', label: 'Health' },
  { value: 'education', label: 'Education' },
  { value: 'automotive', label: 'Automotive' },
];

const sortOptions = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'reviews', label: 'Most Reviews' },
  { value: 'newest', label: 'Newest' },
];

export default function SearchResults() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [claimFormOpen, setClaimFormOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<{ id: number; name: string } | null>(null);

  // Get search parameters from URL
  const urlParams = new URLSearchParams(window.location.search);
  const [searchQuery, setSearchQuery] = useState(urlParams.get('q') || '');
  const [cityFilter, setCityFilter] = useState(urlParams.get('city') || '');
  const [categoryFilter, setCategoryFilter] = useState(urlParams.get('category') || 'all');
  const [sortBy, setSortBy] = useState('relevance');

  // Build API URL with filters
  const buildApiUrl = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (cityFilter) params.set('city', cityFilter);
    if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
    return `/api/businesses/search?${params.toString()}`;
  };

  // Fetch search results
  const { data: businesses, isLoading, refetch } = useQuery({
    queryKey: [buildApiUrl()],
  });

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (cityFilter) params.set('city', cityFilter);
    if (categoryFilter && categoryFilter !== 'all') params.set('category', categoryFilter);
    
    const newUrl = `/search${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState({}, '', newUrl);
    
    refetch();
  }, [searchQuery, cityFilter, categoryFilter, refetch]);

  const handleSearch = (query: string, location: string) => {
    setSearchQuery(query);
    setCityFilter(location);
  };

  const handleWriteReview = (businessId: number) => {
    const business = businesses?.find((b: any) => b.id === businessId);
    if (business) {
      setSelectedBusiness({ id: businessId, name: business.name });
      setReviewFormOpen(true);
    }
  };

  const handleClaimBusiness = (businessId: number) => {
    const business = businesses?.find((b: any) => b.id === businessId);
    if (business) {
      setSelectedBusiness({ id: businessId, name: business.name });
      setClaimFormOpen(true);
    }
  };

  const handleViewDetails = (businessId: number) => {
    navigate(`/business/${businessId}`);
  };

  // Sort businesses based on selected criteria
  const sortedBusinesses = businesses ? [...businesses].sort((a: any, b: any) => {
    switch (sortBy) {
      case 'rating':
        return b.avgRating - a.avgRating;
      case 'reviews':
        return b.reviewCount - a.reviewCount;
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      default:
        return 0; // Keep original order for relevance
    }
  }) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Search Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center mb-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back')}
              </Button>
            </Link>
          </div>
          
          <SearchBar onSearch={handleSearch} className="max-w-4xl" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <Card className="sticky top-4">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Filter className="h-5 w-5 mr-2 text-gray-600" />
                  <h3 className="font-semibold text-gray-900">Filters</h3>
                </div>

                <div className="space-y-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        value={cityFilter}
                        onChange={(e) => setCityFilter(e.target.value)}
                        placeholder="Enter city"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#D32F2F] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {(categoryFilter && categoryFilter !== 'all' || cityFilter) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCategoryFilter('all');
                        setCityFilter('');
                      }}
                      className="w-full"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results */}
          <div className="flex-1">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {searchQuery ? `Results for "${searchQuery}"` : 'Search Results'}
                </h1>
                <p className="text-gray-600">
                  {isLoading ? 'Searching...' : `${sortedBusinesses.length} businesses found`}
                  {cityFilter && ` in ${cityFilter}`}
                </p>
              </div>

              {/* Sort Options */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
                    <div className="h-48 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Results Grid */}
            {!isLoading && sortedBusinesses.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {sortedBusinesses.map((business: any) => (
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

            {/* No Results */}
            {!isLoading && sortedBusinesses.length === 0 && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No businesses found
                </h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your search criteria or browse our categories.
                </p>
                <div className="flex justify-center space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setCityFilter('');
                      setCategoryFilter('all');
                    }}
                  >
                    Clear Search
                  </Button>
                  <Link href="/add-business">
                    <Button className="bg-[#D32F2F] hover:bg-[#B71C1C]">
                      Add Business
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
