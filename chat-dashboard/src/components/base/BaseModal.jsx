import * as Dialog from '@radix-ui/react-dialog';

import SpinWheelBackground from '@/components/category/skill-games/spinWheel/SpinWheelBackground';
import { cn } from '@/lib/utils';

const BaseModal = ({
  children,
  isOpen,
  onClose,
  cssClass,
  showSpinWheelBackground,
}) => {
  const handleOpenChange = (open) => {
    if (!open && onClose) {
      onClose();
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[rgba(103,103,103,0.30)] backdrop-blur-[6px] data-[state=open]:animate-overlayShow">
          {/* Only show SpinWheel background if flag is true */}
          {showSpinWheelBackground && <SpinWheelBackground />}
          <Dialog.Content
            className={cn(
              'fixed left-1/2 top-1/2 z-[400] mx-auto flex max-h-screen w-full max-w-7xl -translate-x-1/2 -translate-y-1/2 justify-center bg-transparent data-[state=open]:animate-contentShow focus:outline-none',
              cssClass,
            )}
          >
            <Dialog.Title className="DialogTitle" />
            <Dialog.Description />
            {children}
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default BaseModal;
