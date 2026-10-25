import { useRef, useState } from 'react';
import { apiRequest, createRequestId, money } from '../api';
import Icon from './Icon';

const countries = [
  ['US', 'United States'],
  ['IL', 'Israel'],
  ['GB', 'United Kingdom'],
  ['FR', 'France'],
  ['DE', 'Germany'],
  ['AE', 'United Arab Emirates'],
  ['CA', 'Canada'],
  ['AU', 'Australia'],
];

export default function Checkout({ items, shippingPolicy, onComplete, onBack }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const attempt = useRef(null);
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const shipping = subtotal >= shippingPolicy.freeAbove ? 0 : shippingPolicy.standard;

  async function submit(event) {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setPending(true);
    const customer = Object.fromEntries(new FormData(event.currentTarget));
    const payload = {
      customer,
      items: items.map(({ product, quantity }) => ({ productId: product.id, quantity })),
    };
    const fingerprint = JSON.stringify(payload);
    try {
      // Reuse the request key after a timeout; retrying must not create two orders.
      if (!attempt.current || attempt.current.fingerprint !== fingerprint)
        attempt.current = { fingerprint, key: createRequestId() };
      const { order } = await apiRequest('/orders', {
        method: 'POST',
        headers: { 'Idempotency-Key': attempt.current.key },
        body: fingerprint,
      });
      onComplete(order);
    } catch (failure) {
      setError(failure.message);
      setFieldErrors(
        Object.fromEntries(
          (failure.fields || []).map((field) => [
            field.path.replace('customer.', ''),
            field.message,
          ]),
        ),
      );
    } finally {
      setPending(false);
    }
  }

  function field(name, label, options = {}) {
    return (
      <label className={options.wide ? 'field wide' : 'field'}>
        {label}
        <input
          name={name}
          required
          aria-invalid={Boolean(fieldErrors[name])}
          aria-describedby={fieldErrors[name] ? `${name}-error` : undefined}
          maxLength={options.maxLength || 100}
          {...options.input}
        />
        {fieldErrors[name] && (
          <small id={`${name}-error`} className="field-error">
            {fieldErrors[name]}
          </small>
        )}
      </label>
    );
  }

  return (
    <div className="checkout-content">
      <button className="text-button back-link" onClick={onBack}>
        ← Back to your bag
      </button>
      <span className="eyebrow">THE NEXT CHAPTER</span>
      <h2>Make it yours.</h2>
      <div className="demo-notice">
        <Icon name="shield" size={22} />
        <p>
          <strong>A working demo, with no payment.</strong>Use sample delivery details.
          Your order is saved to the store’s database; no watch is shipped and no email is
          sent.
        </p>
      </div>
      <form className="checkout-layout" onSubmit={submit}>
        <fieldset disabled={pending} className="checkout-fields">
          <legend>Delivery details</legend>
          <div className="form-grid">
            {field('name', 'Full name', {
              wide: true,
              input: { autoComplete: 'name', minLength: 2, placeholder: 'Alex Morgan' },
            })}
            {field('email', 'Email address', {
              wide: true,
              maxLength: 254,
              input: {
                type: 'email',
                autoComplete: 'email',
                placeholder: 'alex@example.com',
              },
            })}
            {field('address', 'Street address', {
              wide: true,
              maxLength: 200,
              input: {
                autoComplete: 'street-address',
                minLength: 5,
                placeholder: '12 Avenue Lane',
              },
            })}
            {field('city', 'City', {
              input: {
                autoComplete: 'address-level2',
                minLength: 2,
                placeholder: 'New York',
              },
            })}
            {field('postalCode', 'Postal code', {
              maxLength: 20,
              input: { autoComplete: 'postal-code', minLength: 2, placeholder: '10001' },
            })}
            <label className="field wide">
              Country
              <select name="country" autoComplete="country" defaultValue="US">
                {countries.map(([code, label]) => (
                  <option value={code} key={code}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
        <aside className="checkout-summary">
          <span className="eyebrow">YOUR SELECTION</span>
          {items.map(({ product, quantity }) => (
            <div className="summary-item" key={product.id}>
              <img src={product.image} alt="" />
              <div>
                <strong>{product.name}</strong>
                <small>Quantity {quantity}</small>
              </div>
              <span>{money(product.price * quantity)}</span>
            </div>
          ))}
          <div className="bag-totals">
            <div>
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div>
              <span>Delivery</span>
              <span>{shipping ? money(shipping) : 'On us'}</span>
            </div>
            <div className="total">
              <span>Total · USD</span>
              <span>{money(subtotal + shipping)}</span>
            </div>
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <button
            className="button button-dark full-width"
            type="submit"
            disabled={pending || !items.length}
          >
            {pending ? 'Saving your order…' : 'Place demo order'}
            <Icon name="arrow" />
          </button>
          <p className="fine-print">No payment · Final pricing verified by the server</p>
        </aside>
      </form>
    </div>
  );
}
