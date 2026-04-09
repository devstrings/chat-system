import Svgs from '@/components/icons/Svgs';
import { cn } from '@/lib/utils';

const IconButton = ({
  className,
  Icon = Svgs.Sidebar,
  onClick = () => {},
  iconClassName,
}) => {
  return (
    <button
      onClick={onClick}
      type="button"
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-xl bg-transparent',
        className,
      )}
    >
      <Icon className={iconClassName} />
    </button>
  );
};

export default IconButton;
