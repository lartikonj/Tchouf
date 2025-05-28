import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      // Header
      'tchouf.title': 'Tchouf.com',
      'auth.signIn': 'Sign In',
      'auth.signUp': 'Sign Up',
      'auth.signOut': 'Sign Out',
      
      // Hero
      'hero.title': 'Find the Best Businesses in Algeria',
      'hero.subtitle': 'Discover, review, and connect with local businesses across Algeria',
      'search.placeholder': 'What are you looking for?',
      'search.location': 'Where?',
      'search.button': 'Search',
      
      // Categories
      'categories.title': 'Popular Categories',
      'category.restaurants': 'Restaurants',
      'category.shopping': 'Shopping',
      'category.services': 'Services',
      'category.health': 'Health',
      'category.education': 'Education',
      'category.automotive': 'Automotive',
      
      // Business
      'business.featured': 'Featured Businesses',
      'business.verified': 'Verified',
      'business.pending': 'Claim Pending',
      'business.viewAll': 'View All',
      'business.writeReview': 'Write Review',
      'business.viewDetails': 'View Details',
      'business.claimBusiness': 'Claim Business',
      'business.addBusiness': 'Add Business',
      'business.addYourBusiness': 'Add Your Business to Tchouf.com',
      'business.joinThousands': 'Join thousands of local businesses and connect with customers across Algeria',
      
      // Reviews
      'reviews.recent': 'Recent Reviews',
      'reviews.rating': 'reviews',
      'reviews.writeReview': 'Write a Review',
      'reviews.submit': 'Submit Review',
      'reviews.comment': 'Your review',
      'reviews.rating.label': 'Rating',
      
      // Auth
      'auth.welcomeBack': 'Welcome Back',
      'auth.joinTchouf': 'Join Tchouf',
      'auth.signInAccount': 'Sign in to your account',
      'auth.createAccount': 'Create your account',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.continueWith': 'Or continue with',
      'auth.signInGoogle': 'Sign in with Google',
      'auth.dontHaveAccount': "Don't have an account?",
      'auth.alreadyHaveAccount': 'Already have an account?',
      
      // Forms
      'form.required': 'This field is required',
      'form.email.invalid': 'Please enter a valid email',
      'form.password.min': 'Password must be at least 6 characters',
      'form.submit': 'Submit',
      'form.cancel': 'Cancel',
      
      // Common
      'common.loading': 'Loading...',
      'common.error': 'An error occurred',
      'common.success': 'Success!',
      'common.close': 'Close',
      'common.save': 'Save',
      'common.edit': 'Edit',
      'common.delete': 'Delete',
      'common.back': 'Back',
      
      // Footer
      'footer.tagline': 'Made with ❤️ in Algeria',
      'footer.forBusinesses': 'For Businesses',
      'footer.support': 'Support',
      'footer.legal': 'Legal',
    }
  },
  ar: {
    translation: {
      // Header
      'tchouf.title': 'تشوف.كوم',
      'auth.signIn': 'تسجيل الدخول',
      'auth.signUp': 'إنشاء حساب',
      'auth.signOut': 'تسجيل الخروج',
      
      // Hero
      'hero.title': 'اعثر على أفضل الأعمال في الجزائر',
      'hero.subtitle': 'اكتشف واستعرض وتواصل مع الأعمال المحلية في جميع أنحاء الجزائر',
      'search.placeholder': 'ماذا تبحث عنه؟',
      'search.location': 'أين؟',
      'search.button': 'بحث',
      
      // Categories
      'categories.title': 'الفئات الشائعة',
      'category.restaurants': 'المطاعم',
      'category.shopping': 'التسوق',
      'category.services': 'الخدمات',
      'category.health': 'الصحة',
      'category.education': 'التعليم',
      'category.automotive': 'السيارات',
      
      // Business
      'business.featured': 'الأعمال المميزة',
      'business.verified': 'موثق',
      'business.pending': 'في انتظار المطالبة',
      'business.viewAll': 'عرض الكل',
      'business.writeReview': 'اكتب مراجعة',
      'business.viewDetails': 'عرض التفاصيل',
      'business.claimBusiness': 'طالب بالعمل',
      'business.addBusiness': 'أضف عمل',
      'business.addYourBusiness': 'أضف عملك إلى تشوف.كوم',
      'business.joinThousands': 'انضم إلى آلاف الأعمال المحلية وتواصل مع العملاء في جميع أنحاء الجزائر',
      
      // Reviews
      'reviews.recent': 'المراجعات الأخيرة',
      'reviews.rating': 'مراجعة',
      'reviews.writeReview': 'اكتب مراجعة',
      'reviews.submit': 'إرسال المراجعة',
      'reviews.comment': 'مراجعتك',
      'reviews.rating.label': 'التقييم',
      
      // Auth
      'auth.welcomeBack': 'مرحباً بعودتك',
      'auth.joinTchouf': 'انضم إلى تشوف',
      'auth.signInAccount': 'سجل الدخول إلى حسابك',
      'auth.createAccount': 'أنشئ حسابك',
      'auth.email': 'البريد الإلكتروني',
      'auth.password': 'كلمة المرور',
      'auth.continueWith': 'أو تابع مع',
      'auth.signInGoogle': 'سجل الدخول مع جوجل',
      'auth.dontHaveAccount': 'ليس لديك حساب؟',
      'auth.alreadyHaveAccount': 'لديك حساب بالفعل؟',
      
      // Forms
      'form.required': 'هذا الحقل مطلوب',
      'form.email.invalid': 'يرجى إدخال بريد إلكتروني صحيح',
      'form.password.min': 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      'form.submit': 'إرسال',
      'form.cancel': 'إلغاء',
      
      // Common
      'common.loading': 'جاري التحميل...',
      'common.error': 'حدث خطأ',
      'common.success': 'نجح!',
      'common.close': 'إغلاق',
      'common.save': 'حفظ',
      'common.edit': 'تعديل',
      'common.delete': 'حذف',
      'common.back': 'رجوع',
      
      // Footer
      'footer.tagline': 'صُنع بـ ❤️ في الجزائر',
      'footer.forBusinesses': 'للأعمال',
      'footer.support': 'الدعم',
      'footer.legal': 'قانوني',
    }
  },
  fr: {
    translation: {
      // Header
      'tchouf.title': 'Tchouf.com',
      'auth.signIn': 'Se connecter',
      'auth.signUp': "S'inscrire",
      'auth.signOut': 'Se déconnecter',
      
      // Hero
      'hero.title': 'Trouvez les Meilleures Entreprises en Algérie',
      'hero.subtitle': 'Découvrez, évaluez et connectez-vous avec les entreprises locales à travers l\'Algérie',
      'search.placeholder': 'Que cherchez-vous?',
      'search.location': 'Où?',
      'search.button': 'Rechercher',
      
      // Categories
      'categories.title': 'Catégories Populaires',
      'category.restaurants': 'Restaurants',
      'category.shopping': 'Shopping',
      'category.services': 'Services',
      'category.health': 'Santé',
      'category.education': 'Éducation',
      'category.automotive': 'Automobile',
      
      // Business
      'business.featured': 'Entreprises en Vedette',
      'business.verified': 'Vérifié',
      'business.pending': 'Réclamation en Attente',
      'business.viewAll': 'Voir Tout',
      'business.writeReview': 'Écrire un Avis',
      'business.viewDetails': 'Voir Détails',
      'business.claimBusiness': 'Revendiquer Entreprise',
      'business.addBusiness': 'Ajouter Entreprise',
      'business.addYourBusiness': 'Ajoutez Votre Entreprise à Tchouf.com',
      'business.joinThousands': 'Rejoignez des milliers d\'entreprises locales et connectez-vous avec les clients à travers l\'Algérie',
      
      // Reviews
      'reviews.recent': 'Avis Récents',
      'reviews.rating': 'avis',
      'reviews.writeReview': 'Écrire un Avis',
      'reviews.submit': 'Soumettre l\'Avis',
      'reviews.comment': 'Votre avis',
      'reviews.rating.label': 'Note',
      
      // Auth
      'auth.welcomeBack': 'Bon Retour',
      'auth.joinTchouf': 'Rejoindre Tchouf',
      'auth.signInAccount': 'Connectez-vous à votre compte',
      'auth.createAccount': 'Créez votre compte',
      'auth.email': 'Email',
      'auth.password': 'Mot de passe',
      'auth.continueWith': 'Ou continuez avec',
      'auth.signInGoogle': 'Se connecter avec Google',
      'auth.dontHaveAccount': 'Pas de compte?',
      'auth.alreadyHaveAccount': 'Déjà un compte?',
      
      // Forms
      'form.required': 'Ce champ est requis',
      'form.email.invalid': 'Veuillez entrer un email valide',
      'form.password.min': 'Le mot de passe doit contenir au moins 6 caractères',
      'form.submit': 'Soumettre',
      'form.cancel': 'Annuler',
      
      // Common
      'common.loading': 'Chargement...',
      'common.error': 'Une erreur s\'est produite',
      'common.success': 'Succès!',
      'common.close': 'Fermer',
      'common.save': 'Sauvegarder',
      'common.edit': 'Modifier',
      'common.delete': 'Supprimer',
      'common.back': 'Retour',
      
      // Footer
      'footer.tagline': 'Fait avec ❤️ en Algérie',
      'footer.forBusinesses': 'Pour les Entreprises',
      'footer.support': 'Support',
      'footer.legal': 'Légal',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
