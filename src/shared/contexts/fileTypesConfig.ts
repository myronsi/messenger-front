import { 
  FileText, 
  FileImage, 
  FileVideo2, 
  FileAudio2, 
  File, 
  FileArchive, 
  Table, 
  Presentation, 
  FileCode2, 
  Database,
  FileType2,
  ArrowDownToLine,
  FileDown,
  LucideProps
} from 'lucide-react';
import { useLanguage } from '@/shared/contexts/LanguageContext';

export interface FileTypeConfig {
  extensions: string[];
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & 
    React.RefAttributes<SVGSVGElement>
  >;
  onHover: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & 
    React.RefAttributes<SVGSVGElement>
  >;
  replyText: string;
  isSpecial?: boolean;
}

export const getFileTypes = () => {
  const { translations } = useLanguage();
  
  const fileTypes: FileTypeConfig[] = [
    {
      extensions: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'],
      icon: FileImage,
      onHover: ArrowDownToLine,
      replyText: translations.image,
      isSpecial: true,
    },
    {
      extensions: ['.opus'],
      icon: FileAudio2,
      onHover: ArrowDownToLine,
      replyText: translations.voiceMessage,
      isSpecial: true,
    },
    {
      extensions: ['.mp3', '.wav', '.ogg'],
      icon: FileAudio2,
      onHover: ArrowDownToLine,
      replyText: translations.music,
    },
    {
      extensions: ['.mp4', '.mov', '.avi', '.mkv'],
      icon: FileVideo2,
      onHover: ArrowDownToLine,
      replyText: translations.video,
    },
    {
      extensions: ['.pdf'],
      icon: FileText,
      onHover: ArrowDownToLine,
      replyText: translations.pdfDocument,
    },
    {
      extensions: ['.doc', '.docx'],
      icon: FileType2,
      onHover: ArrowDownToLine,
      replyText: translations.wordDocument,
    },
    {
      extensions: ['.txt', '.rtf'],
      icon: FileType2,
      onHover: ArrowDownToLine,
      replyText: translations.textFile,
    },
    {
      extensions: ['.zip', '.rar', '.7z', '.tar', '.gz'],
      icon: FileArchive,
      onHover: ArrowDownToLine,
      replyText: translations.archive,
    },
    {
      extensions: ['.xls', '.xlsx', '.csv'],
      icon: Table,
      onHover: ArrowDownToLine,
      replyText: translations.excelTable,
    },
    {
      extensions: ['.ppt', '.pptx'],
      icon: Presentation,
      onHover: ArrowDownToLine,
      replyText: translations.powerpointPresentation,
    },
    {
      extensions: ['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css'],
      icon: FileCode2,
      onHover: ArrowDownToLine,
      replyText: translations.sourceCode,
    },
    {
      extensions: ['.sql', '.db', '.sqlite'],
      icon: Database,
      onHover: ArrowDownToLine,
      replyText: translations.database,
    },
  ];

  const getFileTypeConfig = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return fileTypes.find((config) => 
      config.extensions.some(ext => ext.slice(1) === extension)
    );
  };

  return {
    fileTypes,
    getFileTypeConfig
  };
};
