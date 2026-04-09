import * as Progress from '@radix-ui/react-progress';

import { cn } from '@/lib/utils';

const Progressbar = ({ progressClassName, progress, indicatorClassName }) => {
  return (
    <Progress.Root
      className={cn(
        'relative h-2 w-full overflow-hidden rounded-full bg-[var(--light-4)] dark:bg-[var(--black-4)]',
        progressClassName,
      )}
      value={progress}
    >
      <Progress.Indicator
        className={cn(
          'h-full w-full origin-left rounded-full bg-[var(--black-1)] transition-transform duration-700 ease-in-out dark:bg-[var(--light-1)]',
          indicatorClassName,
        )}
        style={{ transform: `translateX(-${100 - progress}%)` }}
      />
    </Progress.Root>
  );
};

export default Progressbar;
