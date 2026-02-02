import React, { ReactNode } from 'react';
import { Button } from './ui/button';
import { Info } from 'lucide-react';
import { AboutDialog } from './AboutDialog';
import { SettingsDialog } from './SettingsDialog';
import { useAppKit } from '@mchen-lab/app-kit/frontend';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  logo?: string;              // Optional logo image path - falls back to first letter if not provided
  statusBadges?: ReactNode;   // Slot for status badges (displayed after title)
  actionButtons?: ReactNode;  // Slot for action buttons (displayed before Settings/About)
  secondaryBar?: ReactNode;   // Slot for secondary action bar (displayed below header)
}

export function Layout({ 
  children, 
  title = "Simple Llm Service",
  logo,
  statusBadges,
  actionButtons,
  secondaryBar
}: LayoutProps) {
  const { version } = useAppKit();
  const [showAbout, setShowAbout] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Primary Header */}
      <header className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-full mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          {/* Left side: Logo, Title, Status Badges */}
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-3">
              {logo ? (
                <img 
                  src={logo} 
                  alt={title} 
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg shadow-sm"
                />
              ) : (
                <div className="h-7 w-7 sm:h-8 sm:w-8 bg-slate-900 rounded-lg flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-base sm:text-lg select-none">
                    {title.charAt(0)}
                  </span>
                </div>
              )}
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-slate-900">
                {title}
              </h1>
            </div>

            {/* Status badges slot with divider */}
            {statusBadges && (
              <div className="hidden sm:flex items-center gap-4">
                <div className="h-5 w-px bg-slate-200" />
                <div className="flex items-center gap-2">
                  {statusBadges}
                </div>
              </div>
            )}
          </div>

          {/* Right side: Action Buttons, Settings, About */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Action buttons slot */}
            {actionButtons && (
              <div className="flex items-center gap-2">
                {actionButtons}
              </div>
            )}

            {/* SettingsDialog manages its own open state via ConfigDialog */}
            <SettingsDialog />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowAbout(true)}
              className="h-8 w-8 sm:h-9 sm:w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full"
              title="About"
            >
              <Info className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Secondary Action Bar */}
      {secondaryBar && (
        <div className="bg-white border-b px-4 sm:px-6 py-2 flex flex-wrap items-center gap-2 sm:gap-3">
          {secondaryBar}
        </div>
      )}

      {/* Full-width main content */}
      <main className="flex-1 w-full p-4 sm:p-6">
        {children}
      </main>

      <AboutDialog 
        isOpen={showAbout}
        onOpenChange={setShowAbout}
        appName={title}
        version={version?.version}
        commit={version?.commit}
      />
    </div>
  );
}


