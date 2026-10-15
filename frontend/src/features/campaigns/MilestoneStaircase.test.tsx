import { render, screen } from '@testing-library/react';
import { MilestoneStaircase } from './MilestoneStaircase';

const ladder = [
  { minViews: 10_000, payoutPaise: 50_000 },
  { minViews: 50_000, payoutPaise: 200_000 },
  { minViews: 100_000, payoutPaise: 500_000 },
];

describe('MilestoneStaircase', () => {
  it('lights only the highest rung reached and marks lower crossed rungs as replaced', () => {
    render(<MilestoneStaircase milestones={ladder} views={75_000} />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((item) => item.getAttribute('data-state'))).toEqual(['replaced', 'paid', 'locked']);
  });

  it('shows every rung as locked when no views are provided', () => {
    render(<MilestoneStaircase milestones={ladder} />);
    expect(screen.getAllByRole('listitem').every((item) => item.getAttribute('data-state') === 'locked')).toBe(true);
  });

  it('formats rupee amounts', () => {
    render(<MilestoneStaircase milestones={ladder} views={0} />);
    expect(screen.getByText('₹2,000')).toBeInTheDocument();
  });
});
