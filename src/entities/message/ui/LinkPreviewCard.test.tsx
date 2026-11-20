import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LinkPreviewCard from './LinkPreviewCard';

const query = vi.fn();
vi.mock('../api/linkPreviewApi', () => ({ useGetLinkPreviewQuery: (...args: unknown[]) => query(...args) }));
vi.mock('@/shared/api/goSocket', () => ({ isGoApi: () => true }));
vi.mock('./ExternalLinkConfirm', () => ({
  ExternalLinkConfirm: ({ href, open }: { href: string; open: boolean }) => (open ? <div role="dialog">{href}</div> : null),
}));
vi.mock('@/shared/ui/AuthenticatedImage', () => ({
  AuthenticatedImage: (props: { src: string; className: string; onError?: () => void; onLoad?: () => void }) => (
    <img alt="" data-testid="preview-image" src={props.src} className={props.className} onError={props.onError} onLoad={props.onLoad} />
  ),
}));

describe('LinkPreviewCard', () => {
  beforeEach(() => query.mockReset());

  it('shows the site, title, description and a wide image as a banner', () => {
    query.mockReturnValue({ currentData: {
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
    fireEvent.load(screen.getByTestId('preview-image'));
    expect(screen.getByTestId('preview-image').className).toContain('w-full');
    expect(query).toHaveBeenCalledWith('https://example.com/post', { skip: false });
  });

  it('uses a small thumbnail when the image size is unknown', () => {
    query.mockReturnValue({ currentData: { url: 'https://example.com', title: 'Home', description: null, site_name: null, image: { url: '/i', width: null, height: null } } });
    render(<LinkPreviewCard url="https://example.com" isMine />);
    fireEvent.load(screen.getByTestId('preview-image'));
    expect(screen.getByTestId('preview-image').className).toContain('h-14');
  });

  it('never draws an empty image frame while the image loads or after it fails', () => {
    query.mockReturnValue({ currentData: { url: 'https://example.com', title: 'Home', description: null, site_name: null, image: { url: '/i', width: null, height: null } } });
    render(<LinkPreviewCard url="https://example.com" isMine={false} />);
    expect(screen.getByTestId('preview-image')).toHaveClass('opacity-0');
    expect(screen.getByTestId('preview-image').className).not.toContain('h-14');
    fireEvent.error(screen.getByTestId('preview-image'));
    expect(screen.queryByTestId('preview-image')).not.toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('shows nothing until there is a preview', () => {
    query.mockReturnValue({ currentData: undefined });
    render(<LinkPreviewCard url="https://example.com" isMine={false} />);
    expect(screen.queryByTestId('link-preview')).not.toBeInTheDocument();
  });
});

describe('LinkPreviewCard with a changed link', () => {
  it('does not show the previous link preview while the new one loads', () => {
    query.mockReturnValue({ currentData: undefined, data: { url: 'https://old.example', title: 'Old site', description: null, site_name: null, image: null } });
    render(<LinkPreviewCard url="https://new.example" isMine={false} />);
    expect(screen.queryByText('Old site')).not.toBeInTheDocument();
  });
});

describe('LinkPreviewCard image failures', () => {
  it('shows the image of a new link even after the previous image failed', () => {
    const preview = (url: string, image: string) => ({
      currentData: { url, title: url, description: null, site_name: null, image: { url: image, width: null, height: null } },
    });
    query.mockReturnValue(preview('https://a.example', '/img-a'));
    const view = render(<LinkPreviewCard url="https://a.example" isMine={false} />);
    fireEvent.error(screen.getByTestId('preview-image'));
    expect(screen.queryByTestId('preview-image')).not.toBeInTheDocument();
    query.mockReturnValue(preview('https://b.example', '/img-b'));
    view.rerender(<LinkPreviewCard url="https://b.example" isMine={false} />);
    expect(screen.getByTestId('preview-image')).toBeInTheDocument();
  });
});
