import { render, screen } from '@testing-library/react';
import WordCard from './WordCard';

test('renders word facts as a text list like examples', () => {
  render(<WordCard word={{ word: 'sample', facts: ['First fact', 'Second fact'] }} />);

  expect(screen.getByText('First fact').tagName).toBe('LI');
  expect(screen.getByText('Second fact').tagName).toBe('LI');
});
