import { Button } from '@/components/ui/button';
import { useChatStore, useModelParams } from '@/src/store';

function RightSidebarToggle({ headerContrast }: { headerContrast: 'light' | 'dark' }) {
  const isRightSidebarOpen = useChatStore(state => state.isRightSidebarOpen);
  const setIsRightSidebarOpen = useChatStore(state => state.setIsRightSidebarOpen);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsRightSidebarOpen(prev => !prev)}
      className={`h-9 w-9 rounded-lg transition-none ${headerContrast === 'dark' ? 'hover:bg-black/10 text-black' : 'hover:bg-white/10 text-white'}`}
    >
      <img
        src={isRightSidebarOpen ? '/assets/open-state-right.svg' : '/assets/closed-state-right.svg'}
        className={`h-5 w-5 transition-none ${headerContrast === 'dark' ? 'brightness-0' : 'brightness-0 invert'}`}
        alt="Toggle Right Sidebar"
      />
    </Button>
  );
}

export function RightSidebarToggleGated({ headerContrast }: { headerContrast: 'light' | 'dark' }) {
  const showRightSidebarToggle = useModelParams(state => state.showRightSidebarToggle);
  if (!showRightSidebarToggle) return null;
  return <RightSidebarToggle headerContrast={headerContrast} />;
}
