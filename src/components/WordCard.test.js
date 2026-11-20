import { render, screen } from '@testing-library/react';
import WordCard from './WordCard';

test('renders word facts as plain text instead of chips', () => {
  render(<WordCard word={{ word: 'sample', facts: ['First fact', 'Second fact'] }} />);

  expect(screen.getByText('First fact').tagName).toBe('P');
  expect(screen.getByText('Second fact').tagName).toBe('P');
});
