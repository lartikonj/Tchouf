import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchBarProps {
  onSearch: (query: string, location: string) => void;
  className?: string;
}

export function SearchBar({ onSearch, className = '' }: SearchBarProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, location);
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="bg-white rounded-2xl p-2 shadow-lg">
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 flex items-center px-4">
            <Search className="h-5 w-5 text-gray-400 mr-3" />
            <Input
              type="text"
              placeholder={t('search.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 shadow-none text-gray-900 placeholder-gray-500 focus-visible:ring-0 py-3"
            />
          </div>
          <div className="flex-1 flex items-center px-4 border-l border-gray-200">
            <MapPin className="h-5 w-5 text-gray-400 mr-3" />
            <Input
              type="text"
              placeholder={t('search.location')}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="border-0 shadow-none text-gray-900 placeholder-gray-500 focus-visible:ring-0 py-3"
            />
          </div>
          <Button 
            type="submit"
            className="bg-[#D32F2F] text-white px-8 py-3 rounded-xl hover:bg-[#B71C1C] transition-colors font-medium"
          >
            {t('search.button')}
          </Button>
        </div>
      </div>
    </form>
  );
}