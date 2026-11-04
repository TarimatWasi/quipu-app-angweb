import { render, screen } from '@testing-library/angular';
import {
  SKELETON_TIMING,
  SkeletonComponent,
  SkeletonShape,
  SLOW_SERVER_NOTICE,
} from './skeleton.component';

async function renderSkeleton(shape: SkeletonShape, subject = 'Pagos') {
  const result = await render(SkeletonComponent, { inputs: { shape, subject } });
  const advance = (ms: number) => {
    vi.advanceTimersByTime(ms);
    result.fixture.detectChanges();
  };
  const blocks = () => result.container.querySelectorAll('.sk').length;
  return { ...result, advance, blocks };
}

describe('SkeletonComponent (P-12 cargando)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is busy from the start, named «Cargando …», but shows nothing before 300 ms', async () => {
    const { advance, blocks } = await renderSkeleton('list');

    const region = screen.getByRole('region', { name: 'Cargando Pagos' });
    expect(region.getAttribute('aria-busy')).toBe('true');
    advance(299);
    expect(blocks()).toBe(0);

    advance(1);
    expect(blocks()).toBeGreaterThan(0);
  });

  it('adds the yellow notice of the server waking up at 8 s, not before', async () => {
    const { advance } = await renderSkeleton('list');

    advance(7_999);
    expect(screen.queryByText(SLOW_SERVER_NOTICE)).toBeNull();

    advance(1);
    const notice = screen.getByText(SLOW_SERVER_NOTICE);
    expect(notice.closest('output')).toBeTruthy();
    expect(notice.closest('app-page-notice')?.classList).toContain('tone-info');
    expect(notice.closest('[role="alert"]')).toBeNull();
  });

  it('stops its timers when the answer arrives and the screen removes it', async () => {
    const { fixture } = await renderSkeleton('detail');

    fixture.destroy();

    expect(vi.getTimerCount()).toBe(0);
  });

  it('takes its times from SKELETON_TIMING', async () => {
    const { fixture, container } = await render(SkeletonComponent, {
      inputs: { shape: 'form', subject: 'Subir voucher' },
      providers: [
        { provide: SKELETON_TIMING, useValue: { showAfterMs: 50, slowNoticeAfterMs: 100 } },
      ],
    });

    vi.advanceTimersByTime(50);
    fixture.detectChanges();
    expect(container.querySelectorAll('.sk').length).toBeGreaterThan(0);
    vi.advanceTimersByTime(50);
    fixture.detectChanges();
    expect(screen.getByText(SLOW_SERVER_NOTICE)).toBeTruthy();
  });

  // Each shape draws its own blocks (Cargando.dc.html): the list has the panel, four figures, the
  // filter bar and five rows; the detail, the panel, five rows and five tiles; the form, four
  // fields with their labels, the button and four tiles.
  it.each([
    ['list', 1 + 1 + 4 + 1 + 5, 5],
    ['detail', 1 + 1 + 5 + 1 + 4 + 1, 5],
    ['form', 1 + 4 * 2 + 1 + 1 + 4, 0],
  ] as const)('the %s shape draws %i blocks, %i of them rows', async (shape, total, rows) => {
    const { advance, container } = await renderSkeleton(shape);

    advance(300);

    expect(container.querySelectorAll('.sk')).toHaveLength(total);
    expect(container.querySelectorAll('.sk.row')).toHaveLength(rows);
    expect(container.querySelectorAll('.sk.input')).toHaveLength(shape === 'form' ? 4 : 0);
  });

  it('pulses for 1.4 s and stays still with reduced motion', () => {
    const styles = String(
      (SkeletonComponent as unknown as { ɵcmp: { styles: readonly string[] } }).ɵcmp.styles,
    );

    expect(styles).toContain('quipu-duracion-pulso)');
    expect(styles).toMatch(
      /prefers-reduced-motion:\s*reduce\)\s*\{\s*\.sk\[[^\]]*\]\s*\{\s*animation:\s*none/,
    );
  });
});
