import { useDrillDown } from '@/hooks/useDrillDown';
import { DrillDownModal } from './DrillDownModal';
import { DrillDownContent } from './DrillDownContent';

export function DrillDownModalStack() {
  const { stack, pop, popTo, clear } = useDrillDown();

  if (stack.length === 0) return null;

  return (
    <>
      {/* Single backdrop for entire stack */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={clear}
      />

      {/* Render each modal in stack */}
      {stack.map((item, index) => (
        <DrillDownModal
          key={item.id}
          item={item}
          index={index}
          total={stack.length}
          breadcrumbs={stack.slice(0, index + 1)}
          onClose={pop}
          onBreadcrumbClick={popTo}
        >
          <DrillDownContent item={item} />
        </DrillDownModal>
      ))}
    </>
  );
}
