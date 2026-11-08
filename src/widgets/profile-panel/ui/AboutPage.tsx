import React from 'react';
import { Info } from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from '@/shared/ui/breadcrumb';
import { PageBackHeader } from '@/shared/ui/PageBackHeader';
import { useLanguage } from '@/shared/contexts/LanguageContext';
import AboutSection from './AboutSection';
import { useSettingsLayout } from '../model/settingsLayout';

const AboutPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { translations } = useLanguage();
  const pane = useSettingsLayout() === 'pane';
  return (
    <div className="flex h-full flex-col bg-white">
      <PageBackHeader onBack={onBack} hideBack={pane}>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbPage className="inline-flex items-center gap-2 font-medium">
              <Info className="h-4 w-4 text-muted-foreground" />{translations.appShell.aboutHelp}
            </BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </PageBackHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <AboutSection />
      </div>
    </div>
  );
};

export default AboutPage;
