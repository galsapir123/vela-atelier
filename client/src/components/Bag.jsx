import { money } from '../api';
import Icon from './Icon';

export default function Bag({
  items,
  shippingPolicy,
  onQuantity,
  onRemove,
  onCheckout,
  onClose,
}) {
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const shipping = subtotal >= shippingPolicy.freeAbove ? 0 : shippingPolicy.standard;
  return (
    <div className="bag-content">
      <span className="eyebrow">A CONSIDERED CHOICE</span>
      <h2>
        Your bag<sup>({items.reduce((sum, item) => sum + item.quantity, 0)})</sup>
      </h2>
      {!items.length ? (
        <div className="empty-state">
          <Icon name="bag" size={48} />
          <h3>Something worth keeping.</h3>
          <p>Your next favorite watch is waiting in the collection.</p>
          <button className="button button-dark" onClick={onClose}>
            Explore the collection <Icon name="arrow" />
          </button>
        </div>
      ) : (
        <>
          <div className="bag-items">
            {items.map(({ product, quantity }) => (
              <article className="bag-item" key={product.id}>
                <img src={product.image} alt={product.name} />
                <div>
                  <span className="eyebrow">{product.collection}</span>
                  <h3>{product.name}</h3>
                  <p>{product.color}</p>
                  <div className="bag-item-controls">
                    <div className="quantity-control">
                      <button
                        aria-label={`Decrease ${product.name} quantity`}
                        disabled={quantity <= 1}
                        onClick={() => onQuantity(product.id, quantity - 1)}
                      >
                        <Icon name="minus" size={12} />
                      </button>
                      <span>{quantity}</span>
                      <button
                        aria-label={`Increase ${product.name} quantity`}
                        disabled={quantity >= Math.min(5, product.stock)}
                        onClick={() => onQuantity(product.id, quantity + 1)}
                      >
                        <Icon name="plus" size={12} />
                      </button>
                    </div>
                    <button
                      className="text-button remove-button"
                      onClick={() => onRemove(product.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <strong>{money(product.price * quantity)}</strong>
              </article>
            ))}
          </div>
          <div className="bag-totals">
            <div>
              <span>Subtotal</span>
              <span>{money(subtotal)}</span>
            </div>
            <div>
              <span>Delivery</span>
              <span>{shipping === 0 ? 'On us' : money(shipping)}</span>
            </div>
            <div className="total">
              <span>Estimated total</span>
              <span>{money(subtotal + shipping)}</span>
            </div>
          </div>
          <p className="shipping-note">
            {shipping === 0
              ? 'Your selection qualifies for complimentary delivery.'
              : `Complimentary delivery from ${money(shippingPolicy.freeAbove)}.`}
          </p>
          <button className="button button-dark full-width" onClick={onCheckout}>
            Continue to checkout <Icon name="arrow" />
          </button>
          <p className="fine-print">
            Demo checkout · No card details or payment required
          </p>
        </>
      )}
    </div>
  );
}
