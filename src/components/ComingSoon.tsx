import React from 'react';
import { Construction } from 'lucide-react';

export const ComingSoon: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-8">
        <Construction className="w-12 h-12 text-primary" />
      </div>
      <h2 className="text-4xl font-display font-black text-foreground mb-4">Coming Soon</h2>
      <p className="text-lg text-foreground/60 max-w-md font-medium">
        We're working hard to bring you something amazing. Updates are coming soon, stay tuned!
      </p>
    </div>
  );
};
