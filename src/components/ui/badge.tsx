import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border border-amber-500/30 bg-amber-500/15 text-amber-400',
        secondary:
          'border border-slate-700 bg-slate-800 text-slate-300',
        destructive:
          'border border-rose-500/30 bg-rose-500/15 text-rose-400',
        success:
          'border border-emerald-500/40 bg-emerald-500/20 text-emerald-400',
        outline:
          'border border-slate-700 text-slate-300',
        indigo:
          'border border-indigo-500/30 bg-indigo-500/20 text-indigo-300',
        purple:
          'border border-purple-500/30 bg-purple-500/20 text-purple-300',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
