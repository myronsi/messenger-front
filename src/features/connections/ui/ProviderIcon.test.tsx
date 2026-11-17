import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BRAND_ICONS } from '../model/brandIcons';
import { ProviderIcon } from './ProviderIcon';

const BRANDS = ['github', 'spotify', 'steam', 'discord', 'twitch', 'youtube', 'reddit', 'roblox', 'tiktok', 'bluesky', 'mastodon'];

describe('ProviderIcon', () => {
  it('has an official logo for every brand provider', () => {
    expect(Object.keys(BRAND_ICONS).sort()).toEqual([...BRANDS].sort());
    for (const provider of BRANDS) expect(BRAND_ICONS[provider].path).toMatch(/^M/);
  });

  it.each(BRANDS)('draws the %s logo on its brand colour', (provider) => {
    render(<ProviderIcon provider={provider} />);
    const icon = screen.getByTestId(`provider-icon-${provider}`);
    expect(icon).toHaveAttribute('data-brand', BRAND_ICONS[provider].title);
    expect(icon.querySelector('path')).toHaveAttribute('d', BRAND_ICONS[provider].path);
    expect(icon.style.backgroundColor).not.toBe('');
  });

  it('keeps simple icons for Xbox, websites and unknown providers', () => {
    render(<><ProviderIcon provider="xbox" /><ProviderIcon provider="website" /><ProviderIcon provider="myspace" /></>);
    for (const provider of ['xbox', 'website', 'myspace']) {
      const icon = screen.getByTestId(`provider-icon-${provider}`);
      expect(icon).not.toHaveAttribute('data-brand');
      expect(icon.querySelector('svg')).toBeInTheDocument();
    }
  });
});
