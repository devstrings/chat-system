'use client';

import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';

import { useWebsite } from '@/hooks/useWebsite';
import { cn } from '@/lib/utils';

const Calendar = ({
  mode = 'range',
  showOutsideDays = false,
  captionLayout = 'label',
  formatters,
  max,
  min,
  calendarDayButtonClassName,
  ...props
}) => {
  const { getWebsiteData } = useWebsite();
  const currentVariant = getWebsiteData('theme');
  const [selected, setSelected] = useState();
  const [classNames, setClassNames] = useState(null);
  const defaultClassNames = getDefaultClassNames();

  useEffect(() => {
    if (currentVariant === 'skillGames2') {
      setClassNames({
        root: 'p-3 dark:bg-transparent w-screen max-w-[250px] bg-transparent border border-[var(--text-2)] dark:border-[var(--dark-2)] rounded-md',
        chevron: 'dark:text-[var(--text-1)] text-[var(--dark-1)]',
        nav: 'flex items-center gap-1 h-8 w-full absolute top-0 inset-x-0 justify-between',
        month: 'flex flex-col w-full gap-4',
        months: 'flex gap-4 flex-col md:flex-row relative',
        month_caption: 'flex items-center justify-center h-8 w-full px-8',
        dropdowns:
          'w-full flex items-center text-sm font-medium justify-center h-8 gap-1.5',
        dropdown_root:
          'relative border border-[var(--text-5)] dark:border-[var(--dark-5)] rounded-md',
        dropdown: 'absolute bg-popover inset-0 opacity-0',
        caption_label: cn(
          'select-none font-medium',
          captionLayout === 'label'
            ? 'text-sm'
            : 'rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5',
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none',
          defaultClassNames.weekday,
        ),
        month_grid: 'w-full',
        week: cn('flex w-full mt-2', defaultClassNames.week),
        week_number_header: cn(
          'select-none w-(--cell-size)',
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          'text-[0.8rem] select-none text-muted-foreground',
          defaultClassNames.week_number,
        ),
        day: cn(
          'relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none',
          defaultClassNames.day,
        ),
        range_start: cn(
          'rounded-l-md bg-accent',
          defaultClassNames.range_start,
        ),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('rounded-r-md bg-accent', defaultClassNames.range_end),
        today: cn(
          'bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none',
          defaultClassNames.today,
        ),
        outside: cn(
          'dark:text-[var(--dark-5)] text-[var(--text-5)] dark:aria-selected:text-[var(--dark-5)] aria-selected:text-[var(--text-5)]',
          defaultClassNames.outside,
        ),
        disabled: cn(
          'dark:text-[var(--dark-5)] text-[var(--text-5)]',
          defaultClassNames.disabled,
        ),
        hidden: cn('invisible', defaultClassNames.hidden),
      });
    } else if (currentVariant === 'skillGames3') {
      setClassNames({
        root: 'p-3 dark:bg-transparent w-screen max-w-[250px] bg-transparent border border-[var(--dark-1)] dark:border-[var(--dark-1)] rounded-md',
        chevron: 'dark:text-[var(--text-1)] text-[var(--text-1)]',
        nav: 'flex items-center gap-1 h-8 w-full absolute top-0 inset-x-0 justify-between',
        month: 'flex flex-col w-full gap-4',
        months: 'flex gap-4 flex-col md:flex-row relative',
        month_caption: 'flex items-center justify-center h-8 w-full px-8',
        dropdowns:
          'w-full flex items-center text-sm font-medium justify-center h-8 gap-1.5',
        dropdown_root:
          'relative border border-[var(--dark-5)] dark:border-[var(--dark-5)] rounded-md',
        dropdown: 'absolute bg-popover inset-0 opacity-0',
        caption_label: cn(
          'select-none font-medium',
          captionLayout === 'label'
            ? 'text-sm'
            : 'rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5',
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none',
          defaultClassNames.weekday,
        ),
        month_grid: 'w-full',
        week: cn('flex w-full mt-2', defaultClassNames.week),
        week_number_header: cn(
          'select-none w-(--cell-size)',
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          'text-[0.8rem] select-none text-muted-foreground',
          defaultClassNames.week_number,
        ),
        day: cn(
          'relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none',
          defaultClassNames.day,
        ),
        range_start: cn(
          'rounded-l-md bg-accent',
          defaultClassNames.range_start,
        ),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('rounded-r-md bg-accent', defaultClassNames.range_end),
        today: cn(
          'bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none',
          defaultClassNames.today,
        ),
        outside: cn(
          'dark:text-[var(--dark-7)] text-[var(--dark-7)] dark:aria-selected:text-[var(--dark-7)] aria-selected:text-[var(--dark-7)]',
          defaultClassNames.outside,
        ),
        disabled: cn(
          'dark:text-[var(--dark-7)] text-[var(--dark-7)]',
          defaultClassNames.disabled,
        ),
        hidden: cn('invisible', defaultClassNames.hidden),
      });
    } else if (currentVariant === 'socialGames2') {
      setClassNames({
        root: 'p-3 dark:bg-transparent w-screen max-w-[250px] bg-transparent border border-[var(--text-2)] dark:border-[var(--dark-2)] rounded-md',
        chevron: 'dark:text-[var(--text-1)] text-[var(--dark-1)]',
        nav: 'flex items-center gap-1 h-8 w-full absolute top-0 inset-x-0 justify-between',
        month: 'flex flex-col w-full gap-4',
        months: 'flex gap-4 flex-col md:flex-row relative',
        month_caption: 'flex items-center justify-center h-8 w-full px-8',
        dropdowns:
          'w-full flex items-center text-sm font-medium justify-center h-8 gap-1.5',
        dropdown_root:
          'relative border border-[var(--text-5)] dark:border-[var(--dark-5)] rounded-md',
        dropdown: 'absolute bg-popover inset-0 opacity-0',
        caption_label: cn(
          'select-none font-medium',
          captionLayout === 'label'
            ? 'text-sm'
            : 'rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5',
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none',
          defaultClassNames.weekday,
        ),
        month_grid: 'w-full',
        week: cn('flex w-full mt-2', defaultClassNames.week),
        week_number_header: cn(
          'select-none w-(--cell-size)',
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          'text-[0.8rem] select-none text-muted-foreground',
          defaultClassNames.week_number,
        ),
        day: cn(
          'relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none',
          defaultClassNames.day,
        ),
        range_start: cn(
          'rounded-l-md bg-accent',
          defaultClassNames.range_start,
        ),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('rounded-r-md bg-accent', defaultClassNames.range_end),
        today: cn(
          'bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none',
          defaultClassNames.today,
        ),
        outside: cn(
          'dark:text-[var(--dark-5)] text-[var(--text-5)] dark:aria-selected:text-[var(--dark-5)] aria-selected:text-[var(--text-5)]',
          defaultClassNames.outside,
        ),
        disabled: cn(
          'dark:text-[var(--dark-5)] text-[var(--text-5)]',
          defaultClassNames.disabled,
        ),
        hidden: cn('invisible', defaultClassNames.hidden),
      });
    } else {
      setClassNames({
        root: 'p-3 dark:bg-transparent w-screen max-w-[250px] bg-transparent border border-[var(--light-3)] dark:border-[var(--black-3)] rounded-md',
        chevron: 'dark:text-[var(--light-1)] text-[var(--black-1)]',
        nav: 'flex items-center gap-1 h-8 w-full absolute top-0 inset-x-0 justify-between',
        month: 'flex flex-col w-full gap-4',
        months: 'flex gap-4 flex-col md:flex-row relative',
        month_caption: 'flex items-center justify-center h-8 w-full px-8',
        dropdowns:
          'w-full flex items-center text-sm font-medium justify-center h-8 gap-1.5',
        dropdown_root:
          'relative border border-[var(--light-4)] dark:border-[var(--black-4)] rounded-md',
        dropdown: 'absolute bg-popover inset-0 opacity-0',
        caption_label: cn(
          'select-none font-medium',
          captionLayout === 'label'
            ? 'text-sm'
            : 'rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5',
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none',
          defaultClassNames.weekday,
        ),
        month_grid: 'w-full',
        week: cn('flex w-full mt-2', defaultClassNames.week),
        week_number_header: cn(
          'select-none w-(--cell-size)',
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          'text-[0.8rem] select-none text-muted-foreground',
          defaultClassNames.week_number,
        ),
        day: cn(
          'relative w-full h-full p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none',
          defaultClassNames.day,
        ),
        range_start: cn(
          'rounded-l-md bg-accent',
          defaultClassNames.range_start,
        ),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('rounded-r-md bg-accent', defaultClassNames.range_end),
        today: cn(
          'bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none',
          defaultClassNames.today,
        ),
        outside: cn(
          'dark:text-[var(--black-5)] text-[var(--light-5)] dark:aria-selected:text-[var(--black-5)] aria-selected:text-[var(--light-5)]',
          defaultClassNames.outside,
        ),
        disabled: cn(
          'dark:text-[var(--black-5)] text-[var(--light-5)]',
          defaultClassNames.disabled,
        ),
        hidden: cn('invisible', defaultClassNames.hidden),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captionLayout, currentVariant]);

  return (
    <DayPicker
      captionLayout={captionLayout}
      showOutsideDays={showOutsideDays}
      mode={mode}
      selected={selected}
      onSelect={setSelected}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      disabled={
        max ? { after: new Date() } : min ? { before: new Date() } : undefined
      }
      classNames={classNames}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return (
              <ChevronLeftIcon className={cn('size-4', className)} {...props} />
            );
          }
          if (orientation === 'right') {
            return (
              <ChevronRightIcon
                className={cn('size-4', className)}
                {...props}
              />
            );
          }
          return (
            <ChevronDownIcon className={cn('size-4', className)} {...props} />
          );
        },
        DayButton: (props) => (
          <CalendarDayButton
            {...props}
            className={calendarDayButtonClassName}
          />
        ),
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="size-(--cell-size) flex items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
      }}
      {...props}
    />
  );
};

export default Calendar;

function CalendarDayButton({ className, day, modifiers, ...props }) {
  const { getWebsiteData } = useWebsite();
  const currentVariant = getWebsiteData('theme');
  const defaultClassNames = getDefaultClassNames();
  const ref = useRef(null);

  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const hoverVariants = {
    skillGames: 'hover:bg-[var(--light-5)] dark:hover:bg-[var(--black-5)]',
    socialGames: 'hover:bg-[var(--light-5)] dark:hover:bg-[var(--black-5)]',
    skillGames2: 'hover:bg-[var(--text-5)] dark:hover:bg-[var(--dark-5)]',
    socialGames2: 'hover:bg-[var(--text-5)] dark:hover:bg-[var(--dark-5)]',
    skillGames3: 'hover:bg-[var(--dark-5)] dark:hover:bg-[var(--dark-5)]',
  };

  return (
    <button
      ref={ref}
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      disabled={modifiers.disabled}
      className={cn(
        'group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 min-w-(--cell-size) flex aspect-square size-auto w-full flex-col justify-center gap-1 rounded-md font-normal leading-none data-[range-end=true]:rounded-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-start=true]:rounded-l-md data-[range-end=true]:bg-[var(--black-1)] data-[range-middle=true]:bg-[var(--light-3)] data-[range-start=true]:bg-[var(--black-1)] data-[selected-single=true]:bg-[var(--black-1)] data-[range-end=true]:text-[var(--light-1)] data-[range-middle=true]:text-[var(--black-1)] data-[range-start=true]:text-[var(--light-1)] data-[selected-single=true]:text-[var(--light-1)] group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] dark:data-[range-end=true]:bg-[var(--light-1)] dark:data-[range-middle=true]:bg-[var(--black-3)] dark:data-[range-start=true]:bg-[var(--light-1)] dark:data-[selected-single=true]:bg-[var(--light-1)] dark:data-[range-end=true]:text-[var(--black-1)] dark:data-[range-middle=true]:text-[var(--light-1)] dark:data-[range-start=true]:text-[var(--black-1)] dark:data-[selected-single=true]:text-[var(--black-1)] [&>span]:text-xs [&>span]:opacity-70',
        !modifiers.disabled && !modifiers.selected && hoverVariants[currentVariant],
        modifiers.disabled && 'cursor-not-allowed opacity-50',
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}
