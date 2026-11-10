import { File as FileIcon, FileText, FileImage, FileVideo2, FileAudio2, FileArchive, Table, Presentation, FileCode2, Database, FileType2, ArrowDownToLine, LucideProps } from 'lucide-react';
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

export const genericFileType = (replyText: string): FileTypeConfig => ({
  extensions: [],
  icon: FileIcon,
  onHover: ArrowDownToLine,
  replyText,
});

export const useFileTypes = () => {
  const { translations } = useLanguage();
  
  const fileTypes: FileTypeConfig[] = [
    {
      extensions: ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.avif'],
      icon: FileImage,
      onHover: ArrowDownToLine,
      replyText: translations.image,
      isSpecial: true,
    },
    {
      extensions: ['.heic', '.heif', '.svg'],
      icon: FileImage,
      onHover: ArrowDownToLine,
      replyText: translations.image,
    },
    {
      extensions: ['.opus'],
      icon: FileAudio2,
      onHover: ArrowDownToLine,
      replyText: translations.voiceMessage,
      isSpecial: true,
    },
    {
      extensions: ['.mp3', '.wav', '.ogg', '.oga', '.weba', '.m4a', '.aac', '.flac'],
      icon: FileAudio2,
      onHover: ArrowDownToLine,
      replyText: translations.music,
    },
    {
      extensions: ['.mp4', '.mov', '.webm', '.avi', '.mkv'],
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
      extensions: ['.txt', '.rtf', '.md'],
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
      extensions: ['.js', '.ts', '.py', '.java', '.cpp', '.html', '.css', '.json'],
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
