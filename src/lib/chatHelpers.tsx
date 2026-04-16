import 'react';
import { MessageSquare, Globe, FileText } from 'lucide-react';

export const getChatIcon = (type?: string) => {
  switch (type) {
    case 'active':
      return <MessageSquare className="h-4 w-4 text-foreground shrink-0" />;
    case 'inactive':
      return <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />;
    case 'web':
      return <Globe className="h-4 w-4 text-muted-foreground shrink-0" />;
    case 'file':
      return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
    default:
      return <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
};
