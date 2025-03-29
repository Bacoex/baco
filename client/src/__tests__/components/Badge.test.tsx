
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/badge';

describe('Badge Component', () => {
  it('renders with default variant', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Badge className="custom-class">Test Badge</Badge>);
    const badge = screen.getByText('Test Badge');
    expect(badge).toHaveClass('custom-class');
  });
});
