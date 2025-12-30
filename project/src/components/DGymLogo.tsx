import { Dumbbell } from 'lucide-react';

interface DGymLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function DGymLogo({ size = 'md', showText = false }: DGymLogoProps) {
  const sizeClasses = {
    sm: { circle: 'w-8 h-8 sm:w-10 sm:h-10', icon: 'w-4 h-4 sm:w-5 sm:h-5', text: 'text-base sm:text-lg md:text-xl' },
    md: { circle: 'w-10 h-10 sm:w-12 sm:h-12', icon: 'w-5 h-5 sm:w-6 sm:h-6', text: 'text-lg sm:text-xl md:text-2xl' },
    lg: { circle: 'w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16', icon: 'w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10', text: 'text-xl sm:text-2xl md:text-3xl' }
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex items-center gap-2">
      <div className={`${classes.circle} bg-blue-100 rounded-full flex items-center justify-center`}>
        <Dumbbell className={`${classes.icon} text-blue-600`} />
      </div>
      {showText && (
        <span className={`${classes.text} font-bold text-gray-900`}>DGym</span>
      )}
    </div>
  );
}

