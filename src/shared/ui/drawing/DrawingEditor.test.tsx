import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DrawingEditor } from './DrawingEditor';

vi.mock('@/shared/contexts/LanguageContext', () => ({
  useLanguage: () => ({ translations: new Proxy({}, { get: (_target, key) => String(key) }), language: 'en' }),
}));
vi.mock('@/shared/ui/AuthenticatedImage', async () => {
  const { forwardRef } = await import('react');
  return { AuthenticatedImage: forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>((props, ref) => <img ref={ref} {...props} />) };
});

const stageSize = (axis: 'clientWidth' | 'clientHeight', value: number) => Object.defineProperty(HTMLElement.prototype, axis, {
  configurable: true,
  get(this: HTMLElement) { return this.dataset.testid === 'drawing-stage' ? value : 0; },
});

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  stageSize('clientWidth', 424);
  stageSize('clientHeight', 224);
});

afterAll(() => {
  vi.unstubAllGlobals();
  stageSize('clientWidth', 0);
  stageSize('clientHeight', 0);
});

const surface = () => {
  const svg = screen.getByTestId('drawing-surface');
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON: () => ({}) });
  return svg;
};

const drag = (element: Element, points: [number, number][]) => {
  const [first, ...rest] = points;
  fireEvent.pointerDown(element, { pointerId: 1, clientX: first[0], clientY: first[1], button: 0 });
  for (const [x, y] of rest) fireEvent.pointerMove(element, { pointerId: 1, clientX: x, clientY: y });
  fireEvent.pointerUp(element, { pointerId: 1 });
};

const editor = (props: Partial<React.ComponentProps<typeof DrawingEditor>> = {}) => (
  <DrawingEditor src="blob:photo" name="photo.png" aspect={2} confirmLabel="Done" onCancel={vi.fn()} onConfirm={vi.fn()} {...props} />
);

describe('DrawingEditor', () => {
  it('returns the strokes drawn with the pen as fractions of the image', () => {
    const onConfirm = vi.fn();
    render(editor({ onConfirm }));
    drag(surface(), [[20, 10], [100, 50], [180, 90]]);
    fireEvent.click(screen.getByTestId('drawing-confirm'));
    const [drawing, aspect] = onConfirm.mock.calls[0];
    expect(aspect).toBe(2);
    expect(drawing.items).toHaveLength(1);
    expect(drawing.items[0]).toMatchObject({ type: 'stroke', points: [0.1, 0.1, 0.5, 0.5, 0.9, 0.9] });
  });

  it('undoes, erases and adds text labels', () => {
    const onConfirm = vi.fn();
    render(editor({ onConfirm }));
    drag(surface(), [[20, 10], [180, 10]]);
    fireEvent.click(screen.getByLabelText('drawingUndo'));
    fireEvent.click(screen.getByLabelText('drawingRedo'));
    fireEvent.click(screen.getByLabelText('drawingEraser'));
    drag(surface(), [[100, 10], [101, 10]]);
    fireEvent.click(screen.getByLabelText('drawingText'));
    fireEvent.pointerDown(surface(), { pointerId: 2, clientX: 50, clientY: 50, button: 0 });
    fireEvent.change(screen.getByTestId('drawing-text-field'), { target: { value: 'Look' } });
    fireEvent.keyDown(screen.getByTestId('drawing-text-field'), { key: 'Enter' });
    expect(screen.queryByTestId('drawing-text-field')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('drawing-confirm'));
    expect(onConfirm.mock.calls[0][0].items).toEqual([
      expect.objectContaining({ type: 'text', text: 'Look', x: 0.25, y: 0.5 }),
    ]);
  });

  it('types text right on the image and keeps a label that is still being typed', () => {
    const onConfirm = vi.fn();
    render(editor({ onConfirm }));
    fireEvent.click(screen.getByLabelText('drawingText'));
    fireEvent.pointerDown(surface(), { pointerId: 1, clientX: 100, clientY: 20, button: 0 });
    const field = screen.getByTestId('drawing-text-field');
    expect(field.style.left).toBe('50%');
    expect(field.style.top).toBe('20%');
    fireEvent.change(field, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByTestId('drawing-confirm'));
    expect(onConfirm.mock.calls[0][0].items).toEqual([expect.objectContaining({ type: 'text', text: 'Hello' })]);
  });

  it('edits a label when it is tapped with the text tool', () => {
    const onConfirm = vi.fn();
    const initial = { version: 1, items: [{ type: 'text' as const, color: '#3b82f6', x: 0.25, y: 0.5, size: 0.05, text: 'Old' }] };
    render(editor({ onConfirm, initial }));
    fireEvent.click(screen.getByLabelText('drawingText'));
    fireEvent.pointerDown(surface(), { pointerId: 1, clientX: 52, clientY: 51, button: 0 });
    const field = screen.getByTestId('drawing-text-field') as HTMLTextAreaElement;
    expect(field.value).toBe('Old');
    fireEvent.change(field, { target: { value: 'New' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    fireEvent.click(screen.getByTestId('drawing-confirm'));
    expect(onConfirm.mock.calls[0][0].items).toEqual([expect.objectContaining({ text: 'New', color: '#3b82f6', x: 0.25, y: 0.5 })]);
  });

  it('draws with any width chosen on the slider', () => {
    const onConfirm = vi.fn();
    render(editor({ onConfirm }));
    fireEvent.change(screen.getByLabelText('drawingSize'), { target: { value: '1' } });
    drag(surface(), [[20, 10], [180, 90]]);
    fireEvent.click(screen.getByTestId('drawing-confirm'));
    expect(onConfirm.mock.calls[0][0].items[0].width).toBe(0.06);
  });

  it('zooms with the wheel and the buttons without leaving the image', () => {
    render(editor());
    const stage = screen.getByTestId('drawing-stage');
    stage.getBoundingClientRect = () => ({ left: 0, top: 0, width: 424, height: 224, right: 424, bottom: 224, x: 0, y: 0, toJSON: () => ({}) });
    const box = () => (screen.getByTestId('drawing-surface').parentElement as HTMLElement).style.transform;
    fireEvent.wheel(stage, { deltaY: -500, clientX: 212, clientY: 112 });
    expect(box()).toMatch(/scale\(2\.7\d*\)/);
    for (let click = 0; click < 5; click += 1) fireEvent.click(screen.getByLabelText('zoomIn'));
    expect(box()).toContain('scale(6)');
    fireEvent.keyDown(stage, { key: '0' });
    expect(box()).toContain('scale(1)');
  });

  it('keeps drawing after a pinch whose finger is lifted outside the image', () => {
    const onConfirm = vi.fn();
    render(editor({ onConfirm }));
    const stage = screen.getByTestId('drawing-stage');
    fireEvent.pointerDown(stage, { pointerId: 11, pointerType: 'touch', clientX: 10, clientY: 10 });
    fireEvent.pointerDown(stage, { pointerId: 12, pointerType: 'touch', clientX: 60, clientY: 60 });
    fireEvent.pointerUp(document.body, { pointerId: 11, pointerType: 'touch' });
    fireEvent.pointerUp(document.body, { pointerId: 12, pointerType: 'touch' });
    drag(surface(), [[20, 10], [180, 90]]);
    fireEvent.click(screen.getByTestId('drawing-confirm'));
    expect(onConfirm.mock.calls[0][0].items).toHaveLength(1);
  });

  it('starts from an earlier drawing and adds to it', () => {
    const onConfirm = vi.fn();
    const initial = { version: 1, items: [{ type: 'stroke' as const, color: '#ff0000', width: 0.01, points: [0, 0] }] };
    render(editor({ onConfirm, initial }));
    drag(surface(), [[20, 10], [180, 90]]);
    fireEvent.click(screen.getByTestId('drawing-confirm'));
    expect(onConfirm.mock.calls[0][0].items).toEqual([initial.items[0], expect.objectContaining({ type: 'stroke' })]);
  });

  it('shows the send button only after something changed', () => {
    render(editor({ requireItems: true }));
    expect(screen.queryByTestId('drawing-confirm')).not.toBeInTheDocument();
    drag(surface(), [[20, 10], [180, 90]]);
    expect(screen.getByTestId('drawing-confirm')).toBeEnabled();
    fireEvent.click(screen.getByLabelText('drawingUndo'));
    expect(screen.queryByTestId('drawing-confirm')).not.toBeInTheDocument();
  });
});
