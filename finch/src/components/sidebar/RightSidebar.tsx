import { motion, AnimatePresence } from 'framer-motion';

interface RightSidebarProps {
  isOpen: boolean;
}

export const RightSidebar = ({ isOpen }: RightSidebarProps) => {
  return (
    <motion.aside
      initial={false}
      animate={{ 
        width: isOpen ? 320 : 0, 
        opacity: isOpen ? 1 : 0 
      }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="flex-shrink-0 overflow-hidden bg-background/50 backdrop-blur-md border-l border-muted/20 z-20 h-full flex flex-col"
    >
      {/* Empty shell for now */}
    </motion.aside>
  );
};
