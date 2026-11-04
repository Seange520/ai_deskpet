import type { ReactNode } from 'react';
import './ShineBorder.css';

type ShineBorderProps = {
  children: ReactNode;
  className?: string;
};

export default function ShineBorder({ children, className = '' }: ShineBorderProps) {
  return (
    <div className={`shine-border ${className}`}>
      {children}
      <span className="shine-border-light" data-shine-border="" aria-hidden="true" />
    </div>
  );
}
