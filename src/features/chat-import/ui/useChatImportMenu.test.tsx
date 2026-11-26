import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { useChatImportMenu } from './useChatImportMenu';

const imports = vi.hoisted(() => ({ current: [] as unknown[] }));
vi.mock('../api/importApi', () => ({ useGetChatImportsQuery: () => ({ data: imports.current }) }));
vi.mock('./ImportChatDialog', () => ({ ImportChatDialog: () => null }));
vi.mock('./ImportInfoPanel', () => ({ ImportInfoPanel: () => null }));
vi.mock('@/shared/api/goSocket', () => ({ isGoApi: () => true }));
vi.mock('@/shared/api/currentUserApi', () => ({ useGetCurrentUserQuery: () => ({ data: { id: '1', username: 'me', account_display_name: 'Me' } }) }));
vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: { chatImport: { importHistory: 'Import history', info: { title: 'Imported history' } } } }),
}));

const Menu = ({ canImport }: { canImport: boolean }) => {
  const { items } = useChatImportMenu({ chat: { chatId: '5', isGroup: true } as never, canImport });
  return <DropdownMenu open><DropdownMenuTrigger /><DropdownMenuContent>{items}</DropdownMenuContent></DropdownMenu>;
};

describe('useChatImportMenu', () => {
  it('offers the imported history only when the chat has an import', () => {
    imports.current = [];
    const { rerender } = render(<Menu canImport />);
    expect(screen.getByRole('menuitem', { name: 'Import history' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Imported history' })).not.toBeInTheDocument();
    imports.current = [{ id: '9' }];
    rerender(<Menu canImport={false} />);
    expect(screen.getByRole('menuitem', { name: 'Imported history' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: 'Import history' })).not.toBeInTheDocument();
  });
});
