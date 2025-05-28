import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';
import { Eye } from 'lucide-react';
import { FaFacebookF, FaTwitter, FaInstagram } from 'react-icons/fa';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-[#D32F2F] rounded-lg flex items-center justify-center">
                <Eye className="text-white" size={20} />
              </div>
              <h4 className="text-xl font-bold">{t('tchouf.title')}</h4>
            </div>
            <p className="text-gray-400 mb-4">
              Connecting Algeria's businesses with their communities through authentic reviews and recommendations.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <FaFacebookF />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <FaTwitter />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <FaInstagram />
              </a>
            </div>
          </div>
          
          <div>
            <h5 className="font-semibold mb-4">{t('footer.forBusinesses')}</h5>
            <ul className="space-y-2 text-gray-400">
              <li>
                <Link href="/add-business" className="hover:text-white transition-colors">
                  Add Your Business
                </Link>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Claim Your Business
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Business Success Stories
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Advertise
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-semibold mb-4">{t('footer.support')}</h5>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Guidelines
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Report a Problem
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contact Us
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-semibold mb-4">{t('footer.legal')}</h5>
            <ul className="space-y-2 text-gray-400">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Cookie Policy
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Accessibility
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">© 2024 Tchouf.com. All rights reserved.</p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <span className="text-gray-400 text-sm">{t('footer.tagline')}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
