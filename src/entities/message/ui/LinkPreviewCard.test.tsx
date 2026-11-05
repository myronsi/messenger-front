import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LinkPreviewCard from './LinkPreviewCard';

const query = vi.fn();
vi.mock('../api/linkPreviewApi', () => ({ useGetLinkPreviewQuery: (...args: unknown[]) => query(...args) }));
vi.mock('@/shared/api/goSocket', () => ({ isGoApi: () => true }));
vi.mock('./ExternalLinkConfirm', () => ({
  ExternalLinkConfirm: ({ href, open }: { href: string; open: boolean }) => (open ? <div role="dialog">{href}</div> : null),
}));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({ AuthenticatedImage: (props: { src: string; className: string }) => <img alt="" data-testid="preview-image" src={props.src} className={props.className} /> }));

describe('LinkPreviewCard', () => {
  beforeEach(() => query.mockReset());

  it('shows the site, title, description and a wide image as a banner', () => {
    query.mockReturnValue({ data: {
      url: 'https://example.com/post', title: 'A post', description: 'About it', site_name: 'Example',
      image: { url: '/api/v2/link-preview/image?url=x&sig=y', width: 1200, height: 630 },
    } });
    const parent = vi.fn();
    render(<div onClick={parent}><LinkPreviewCard url="https://example.com/post" isMine={false} /></div>);
    const card = screen.getByTestId('link-preview');
    expect(card).toHaveAttribute('href', 'https://example.com/post');
    expect(card).toHaveAttribute('rel', 'noopener noreferrer');
    fireEvent.click(card);
    expect(screen.getByRole('dialog')).toHaveTextContent('https://example.com/post');
    expect(parent).not.toHaveBeenCalled();
    expect(screen.getByText('Example')).toBeInTheDocument();
    expect(screen.getByText('A post')).toBeInTheDocument();
    expect(screen.getByText('About it')).toBeInTheDocument();
    expect(screen.getByTestId('preview-image').className).toContain('w-full');
    expect(query).toHaveBeenCalledWith('https://example.com/post', { skip: false });
  });

  it('uses a small thumbnail when the image size is unknown', () => {
    query.mockReturnValue({ data: { url: 'https://example.com', title: 'Home', description: null, site_name: null, image: { url: '/i', width: null, height: null } } });
    render(<LinkPreviewCard url="https://example.com" isMine />);
    expect(screen.getByTestId('preview-image').className).toContain('h-14');
  });

  it('shows nothing until there is a preview', () => {
    query.mockReturnValue({ data: undefined });
    render(<LinkPreviewCard url="https://example.com" isMine={false} />);
    expect(screen.queryByTestId('link-preview')).not.toBeInTheDocument();
  });
});
