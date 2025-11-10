import { render, screen } from '@testing-library/react';
import Welcome from './Welcome';
import { describe, it, expect } from 'vitest';

describe('Welcome component', () => {
    it('renders the welcome message', () => {
        render(<Welcome />);
        expect(screen.getByText('Welcome to the HAST Agent Visualizer')).toBeInTheDocument();
    });
});
