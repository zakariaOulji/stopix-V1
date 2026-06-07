import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Badge } from './Badge';

describe('<Badge />', () => {
  it('renders its label', () => {
    render(<Badge label="En cours" variant="success" />);
    expect(screen.getByText('En cours')).toBeTruthy();
  });

  it('renders different variants without crashing', () => {
    const { rerender } = render(<Badge label="A" variant="danger" />);
    expect(screen.getByText('A')).toBeTruthy();
    rerender(<Badge label="B" variant="warning" dot />);
    expect(screen.getByText('B')).toBeTruthy();
  });
});
