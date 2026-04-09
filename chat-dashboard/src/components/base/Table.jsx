import { cn } from '@/lib/utils';

function Table({ containerClassName, className, ...props }) {
  return (
    <div
      data-slot="table-outer"
      className={cn(
        'relative w-full overflow-hidden rounded-lg',
        containerClassName,
      )}
    >
      <div data-slot="table-scroll" className="w-full overflow-x-auto scrollbar-thin">
        <table
          data-slot="table"
          className={cn(
            'w-full border-separate border-spacing-0 text-sm text-[var(--text-color-light)] dark:text-[var(--text-color)]',
            className,
          )}
          {...props}
        />
      </div>
    </div>
  );
}

function TableHeader({ className, ...props }) {
  return (
    <thead
      data-slot="table-header"
      className={cn(
        'border-b border-t border-[var(--light-3)] bg-transparent dark:border-[var(--black-3)]',
        className,
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }) {
  return (
    <tbody
      data-slot="table-body"
      className={cn(
        'divide-y divide-[var(--light-3)] bg-transparent dark:divide-[var(--black-3)]',
        className,
      )}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'border-t border-[var(--light-3)] bg-transparent font-medium dark:border-[var(--black-3)]',
        className,
      )}
      {...props}
    />
  );
}

function TableRow({ className, ...props }) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'hover:bg-[var(--light-3)]/40 dark:hover:bg-[var(--black-3)]/40 transition-colors',
        className,
      )}
      {...props}
    />
  );
}

function TableHead({ className, ...props }) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        'whitespace-nowrap bg-transparent px-5 py-4 text-left font-semibold text-[var(--text-color-light)] dark:text-[var(--text-color)]',
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'whitespace-nowrap bg-transparent px-5 py-4 align-middle text-[var(--text-color-light)] dark:text-[var(--text-color)]',
        className,
      )}
      {...props}
    />
  );
}

function TableCaption({ className, ...props }) {
  return (
    <caption
      data-slot="table-caption"
      className={cn(
        'mt-4 text-sm text-[var(--text-color-light)] dark:text-[var(--text-color)]',
        className,
      )}
      {...props}
    />
  );
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};
