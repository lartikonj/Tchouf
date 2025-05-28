import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useFirebaseStorage } from '@/hooks/use-firebase-storage';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { insertBusinessSchema } from '@shared/schema';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';

const categories = [
  'Restaurants',
  'Shopping', 
  'Services',
  'Health',
  'Education',
  'Automotive',
  'Beauty & Spa',
  'Professional Services',
  'Home & Garden',
  'Entertainment',
];

const algerianCities = [
  'Algiers', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Batna', 'Djelfa',
  'Sétif', 'Sidi Bel Abbès', 'Biskra', 'Tébessa', 'El Oued', 'Skikda',
  'Tiaret', 'Béjaïa', 'Tlemcen', 'Ouargla', 'Béchar', 'Mostaganem',
  'Bordj Bou Arréridj', 'Chlef', 'Médéa', 'Tizi Ouzou', 'Mascara',
  'Oum el Bouaghi', 'Guelma', 'Laghouat', 'Khenchela', 'Souk Ahras',
  'El Tarf', 'Jijel', 'Relizane', 'M\'Sila', 'El Bayadh', 'Bouira',
  'Tamanrasset', 'Aflou', 'Adrar', 'Tissemsilt', 'El Eulma', 'Bordj Badji Mokhtar',
  'Ouled Djellal', 'Beni Abbes', 'In Salah', 'In Guezzam', 'Touggourt',
  'Djanet', 'M\'Ghair', 'El Ména'
];

const formSchema = insertBusinessSchema.extend({
  category: z.string().min(1, 'Category is required'),
  city: z.string().min(1, 'City is required'),
  address: z.string().min(1, 'Address is required'),
  name: z.string().min(1, 'Business name is required'),
  location: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function AddBusiness() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { uploadBusinessPhoto, uploading } = useFirebaseStorage();

  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get the business ID from the URL, if it exists
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const editBusinessId = searchParams.get('edit');
  const isEditMode = !!editBusinessId;

  const { data: businessData, isLoading: isBusinessLoading } = useQuery({
    queryKey: ['business', editBusinessId],
    queryFn: async () => {
      if (!editBusinessId) return null;
      const response = await apiRequest('GET', `/api/businesses/${editBusinessId}`);
      return response.json();
    },
    enabled: isEditMode, // Only run query if in edit mode
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
      city: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      location: '',
      photos: [],
      createdBy: user?.id || 0,
    },
    mode: 'onChange', // Enable real-time validation
  });

  // Set createdBy when user changes
  useEffect(() => {
    if (user?.id) {
      form.setValue('createdBy', user.id);
    }
  }, [user?.id, form]);

  useEffect(() => {
    if (businessData) {
      try {
        // Pre-fill the form with business data
        form.setValue('name', businessData.name || '');
        
        // Validate category exists in our list before setting it
        const categoryValue = businessData.category ? businessData.category.toLowerCase() : '';
        const validCategory = categories.find(cat => cat.toLowerCase() === categoryValue);
        form.setValue('category', validCategory ? categoryValue : '');
        
        form.setValue('description', businessData.description || '');
        
        // Validate city exists in our list before setting it
        const validCity = algerianCities.find(city => city === businessData.city);
        form.setValue('city', validCity || '');
        
        form.setValue('address', businessData.address || '');
        form.setValue('phone', businessData.phone || '');
        form.setValue('email', businessData.email || '');
        form.setValue('website', businessData.website || '');
        form.setValue('location', businessData.location || '');
        
        // Set photo URLs
        setPhotoUrls(businessData.photos || []);
      } catch (error) {
        console.error('Error pre-filling form data:', error);
        toast({
          title: "Warning",
          description: "Some business data could not be loaded properly",
          variant: "destructive",
        });
      }
    }
  }, [businessData, form, toast]);

  const createBusinessMutation = useMutation({
    mutationFn: async (businessData: any) => {
      console.log('Creating business with data:', businessData);
      return apiRequest('POST', '/api/businesses', businessData);
    },
    onSuccess: (result) => {
      console.log('Business created successfully:', result);
      toast({
        title: t('common.success'),
        description: 'Business added successfully!',
      });
      navigate('/');
    },
    onError: (error: any) => {
      console.error('Error creating business:', error);
      toast({
        title: t('common.error'),
        description: error.message || 'Failed to create business',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      // Upload photos first
      const uploadedPhotoUrls = [...photoUrls];

      for (const photo of selectedPhotos) {
        try {
          const photoUrl = await uploadBusinessPhoto(photo);
          uploadedPhotoUrls.push(photoUrl);
        } catch (photoError) {
          console.error('Photo upload failed:', photoError);
          toast({
            title: "Warning",
            description: "Some photos failed to upload but business will be saved",
            variant: "destructive",
          });
        }
      }

      // Generate slug from business name
      const slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single
        .trim();

      const businessData = {
        name: data.name,
        category: data.category,
        description: data.description || '',
        city: data.city,
        address: data.address,
        location: data.location || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        slug,
        createdBy: user.id,
        photos: uploadedPhotoUrls,
      };

      console.log('Final business data to submit:', businessData);

      toast({
        title: isEditMode ? 'Updating business...' : 'Creating business...',
        description: 'Please wait while we ' + (isEditMode ? 'update' : 'create') + ' your business listing.',
      });

      // Determine the URL and method based on edit mode
      const url = isEditMode
        ? `/api/businesses/${editBusinessId}`
        : '/api/businesses';
      const method = isEditMode ? 'PATCH' : 'POST';

      // Make the API call directly instead of using mutation for better error handling
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessData),
      });

      console.log('API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API error response:', errorData);
        throw new Error(`Failed to ${isEditMode ? 'update' : 'create'} business: ${response.status} ${errorData}`);
      }

      const result = await response.json();
      console.log('Business ' + (isEditMode ? 'updated' : 'created') + ' successfully:', result);

      toast({
        title: t('common.success'),
        description: 'Business ' + (isEditMode ? 'updated' : 'added') + ' successfully!',
      });

      // Navigate to the new business page using slug if available
      if (result.slug) {
        navigate(`/business/${result.slug}`);
      } else {
        navigate(`/business/${result.id}`);
      }

    } catch (error) {
      console.error('Error submitting business:', error);
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : 'Failed to create business. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedPhotos(prev => [...prev, ...files]);
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <h1 className="text-2xl font-bold mb-4">Sign In Required</h1>
            <p className="text-gray-600 mb-4">Please sign in to add a business.</p>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('common.back')}
          </Button>
        </Link>

        <Card>
          <CardHeader>
           <CardTitle className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Edit Business' : t('business.addBusiness')}
            </CardTitle>
            <p className="text-gray-600">
              Add your business to Tchouf.com and connect with customers across Algeria
            </p>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    {...form.register('name')}
                    placeholder="Enter business name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-600">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select 
                    value={form.watch('category') || ''}
                    onValueChange={(value) => {
                      form.setValue('category', value, { shouldValidate: true });
                      form.clearErrors('category');
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category.toLowerCase()}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.category && (
                    <p className="text-sm text-red-600">{form.formState.errors.category.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Describe your business..."
                  rows={4}
                />
              </div>

              {/* Location */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <Select 
                      value={form.watch('city') || ''}
                      onValueChange={(value) => {
                        form.setValue('city', value, { shouldValidate: true });
                        form.clearErrors('city');
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        {algerianCities.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.formState.errors.city && (
                      <p className="text-sm text-red-600">{form.formState.errors.city.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address *</Label>
                    <Input
                      id="address"
                      {...form.register('address')}
                      placeholder="Street address"
                    />
                    {form.formState.errors.address && (
                      <p className="text-sm text-red-600">{form.formState.errors.address.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location Coordinates (Optional)</Label>
                  <Input
                    id="location"
                    {...form.register('location')}
                    placeholder="e.g., 36.7372°N, 3.0867°E or Google Maps location link"
                  />
                  <p className="text-sm text-gray-500">
                    You can paste coordinates (latitude, longitude) or a Google Maps link to help customers find your business
                  </p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    {...form.register('phone')}
                    placeholder="Phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register('email')}
                    placeholder="Business email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  {...form.register('website')}
                  placeholder="https://yourwebsite.com"
                />
              </div>

              {/* Photos */}
              <div className="space-y-2">
                <Label>Photos</Label>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoChange}
                      className="hidden"
                      id="photos"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('photos')?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Add Photos
                    </Button>
                  </div>

                  {selectedPhotos.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {selectedPhotos.map((photo, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(photo)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                            onClick={() => removePhoto(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <div className="flex space-x-4">
                <Link href="/" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    {t('form.cancel')}
                  </Button>
                </Link>
                <Button 
                  type="submit" 
                  className="flex-1 bg-[#D32F2F] hover:bg-[#B71C1C] disabled:opacity-50"
                  disabled={
                    uploading || 
                    isSubmitting || 
                    !form.watch('name')?.trim() || 
                    !form.watch('category') || 
                    !form.watch('city') || 
                    !form.watch('address')?.trim()
                  }
                >
                  {uploading ? t('common.uploading') : isSubmitting ? (isEditMode ? 'Updating Business...' : 'Creating Business...') : (isEditMode ? 'Update Business' : t('addBusiness.addButton'))}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}