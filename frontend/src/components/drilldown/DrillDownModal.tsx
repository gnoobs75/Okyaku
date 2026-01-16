import { X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { DrillDownItem } from '@/types/drilldown';

interface DrillDownModalProps {
  item: DrillDownItem;
  index: number;
  total: number;
  breadcrumbs: DrillDownItem[];
  onClose: () => void;
  onBreadcrumbClick: (id: string) => void;
  children: React.ReactNode;
}

export function DrillDownModal({
  item,
  index,
  total,
  breadcrumbs,
  onClose,
  onBreadcrumbClick,
  children,
}: DrillDownModalProps) {
  const isTopmost = index === total - 1;

  // Calculate visual stacking offset
  const scaleReduction = Math.min(index * 0.02, 0.1);
  const scale = isTopmost ? 1 : 1 - scaleReduction;
  const opacity = isTopmost ? 1 : 0.7;

  return (
    <div
      className={cn(
        'fixed inset-0 flex items-center justify-center p-4',
        'transition-all duration-200 ease-out',
        isTopmost ? 'pointer-events-auto' : 'pointer-events-none'
      )}
      style={{ zIndex: 51 + index }}
    >
      <div
        className={cn(
          'relative w-full max-w-4xl max-h-[85vh] bg-background rounded-lg shadow-2xl',
          'flex flex-col overflow-hidden',
          'border border-border',
          // Animation
          'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200',
          // Mobile: full screen
          'sm:max-h-[85vh]',
          'max-sm:max-w-full max-sm:h-full max-sm:max-h-full max-sm:rounded-none'
        )}
        style={{
          transform: `scale(${scale})`,
          opacity,
          transition: 'transform 200ms ease-out, opacity 200ms ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 text-sm overflow-x-auto">
            {breadcrumbs.map((crumb, i) => (
              <div key={crumb.id} className="flex items-center gap-1 shrink-0">
                {i > 0 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <button
                  onClick={() => onBreadcrumbClick(crumb.id)}
                  className={cn(
                    'hover:text-primary transition-colors truncate max-w-[150px]',
                    i === breadcrumbs.length - 1
                      ? 'font-semibold text-foreground cursor-default'
                      : 'text-muted-foreground hover:underline'
                  )}
                  disabled={i === breadcrumbs.length - 1}
                >
                  {crumb.title}
                </button>
              </div>
            ))}
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="shrink-0 ml-4"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
