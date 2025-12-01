import { render, screen } from '@testing-library/react';
import Welcome from './Welcome';
import { describe, it, expect } from 'vitest';

describe('Welcome component', () => {
    it('renders the welcome message', () => {
        render(<Welcome />);
        expect(screen.getByText('Secure Your Code with AI')).toBeInTheDocument();
        expect(screen.getByText(/RiskGuard analyzes, detects vulnerabilities/)).toBeInTheDocument();
    });
});
