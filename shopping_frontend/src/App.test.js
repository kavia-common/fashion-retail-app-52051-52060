import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './state/AuthContext';
import { CartProvider } from './state/CartContext';

test('renders navigation brand', () => {
  render(
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
  expect(screen.getByText(/Fashion Retail/i)).toBeInTheDocument();
});
