import { useState } from 'react';
import { apiRequest, money } from '../api';
import Icon from './Icon';

export function OrderReceipt({ order, onClose }) {
  const [copied, setCopied] = useState(false);
  async function copyReference() {
    try {
      await navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="receipt-content">
      <div className="receipt-check">
        <Icon name="check" size={30} />
      </div>
      <span className="eyebrow">A MOMENT TO REMEMBER</span>
      <h2>Beautifully chosen.</h2>
      <p>
        Your demo order is confirmed and saved.
        <br />
        No payment was collected.
      </p>
      <div className="order-reference">
        <span className="eyebrow">KEEP YOUR ORDER REFERENCE</span>
        <strong>{order.orderNumber}</strong>
        <button className="text-button" onClick={copyReference}>
          {copied ? 'Copied ✓' : 'Copy reference'}
        </button>
      </div>
      <div className="receipt-lines">
        {order.items.map((item) => (
          <div key={item.productId}>
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>{money(item.unitPrice * item.quantity)}</span>
          </div>
        ))}
        <div>
          <span>Delivery</span>
          <span>{order.shipping ? money(order.shipping) : 'Complimentary'}</span>
        </div>
        <div className="total">
          <span>Total · USD</span>
          <span>{money(order.total)}</span>
        </div>
      </div>
      <p className="fine-print">
        Status: {order.status} · {new Date(order.createdAt).toLocaleDateString()}
        <br />
        Use your reference and checkout email to find this order again.
      </p>
      <button className="button button-dark full-width" onClick={onClose}>
        Back to the atelier <Icon name="arrow" />
      </button>
    </div>
  );
}

export function OrderLookup({ onFound }) {
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      const { order } = await apiRequest('/orders/lookup', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))),
      });
      onFound(order);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="lookup-content">
      <span className="eyebrow">YOUR VELA STORY</span>
      <h2>Find your order.</h2>
      <p>Enter the reference and email used at checkout.</p>
      <form onSubmit={submit}>
        <label className="field">
          Order reference
          <input name="orderNumber" placeholder="VLA-…" required maxLength={20} />
        </label>
        <label className="field">
          Email address
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
            placeholder="alex@example.com"
          />
        </label>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <button className="button button-dark full-width" disabled={pending}>
          {pending ? 'Finding your order…' : 'View my order'}
          <Icon name="arrow" />
        </button>
      </form>
    </div>
  );
}
