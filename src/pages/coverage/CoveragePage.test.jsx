// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CoveragePage from './CoveragePage';

describe('CoveragePage', () => {
  it('renders the application coverage section', () => {
    render(<CoveragePage />);

    expect(screen.getByText('Application Coverage')).toBeInTheDocument();
    expect(screen.getByText('PaymentAPI')).toBeInTheDocument();
  });
});
