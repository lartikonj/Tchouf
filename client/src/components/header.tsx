import React from 'react';
import { Link, useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AuthModal } from '@/components/auth-modal';
import { LanguageSelector } from '@/components/language-selector';
import { MobileMenu } from '@/components/mobile-menu';
import { useAuth } from '@/hooks/use-auth';
import { useIsMobile } from '@/hooks/use-mobile';
import { User, LogOut, Plus, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export function Header() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();

  const MobileNavContent = () => (
    <>
      <Link href="/search" className="w-full">
        <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-gray-900">
          {t('nav.search')}
        </Button>
      </Link>
      <Link href="/add-business" className="w-full">
        <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-gray-900">
          {t('nav.addBusiness')}
        </Button>
      </Link>
      {user && (
        <>
          <Link href="/profile" className="w-full">
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-gray-900">
              <User className="mr-2 h-4 w-4" />
              {t('nav.profile')}
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-gray-700 hover:text-gray-900"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t('nav.logout')}
          </Button>
        </>
      )}
    </>
  );

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 md:h-16">
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-r from-red-500 to-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm md:text-lg">B</span>
                </div>
                <span className="text-lg md:text-xl font-bold text-gray-900 hidden xs:inline">BusinessHub</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/search">
              <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
                {t('nav.search')}
              </Button>
            </Link>
            <Link href="/add-business">
              <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
                {t('nav.addBusiness')}
              </Button>
            </Link>
          </nav>

          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Language Selector - Hidden on very small screens */}
            <div className="hidden sm:block">
              <LanguageSelector />
            </div>

            {/* Mobile Menu */}
            {isMobile && (
              <MobileMenu>
                <MobileNavContent />
                <div className="border-t pt-4">
                  <LanguageSelector />
                </div>
              </MobileMenu>
            )}

            {/* Desktop User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>{t('nav.profile')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/add-business">
                      <Plus className="mr-2 h-4 w-4" />
                      <span>{t('nav.addBusiness')}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t('nav.logout')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <AuthModal />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}