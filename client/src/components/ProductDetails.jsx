import { useState } from 'react';
import { money } from '../api';
import Icon from './Icon';

export default function ProductDetails({ product, onAdd }) {
  const [quantity, setQuantity] = useState(1);
  const maximumQuantity = Math.min(5, product.stock);
  return (
    <div className="product-detail">
      <div className={`detail-image ${product.imageClass}`}>
        <img src={product.image} alt={`${product.name}, ${product.color}`} />
      </div>
      <div className="detail-content">
        <span className="eyebrow">
          {product.reference} · {product.collection.toUpperCase()}
        </span>
        <h2>
          {product.name}
          <em>{product.subtitle}</em>
        </h2>
        <p className="detail-price">
          {money(product.price)} <small>USD</small>
        </p>
        <p className="detail-description">{product.description}</p>
        <dl className="specifications">
          {[
            ['Case', product.caseSize],
            ['Material', product.material],
            ['Movement', product.movement],
            ['Strap', product.strap],
            ['Water resistance', product.waterResistance],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <div className="availability">
          <i />{' '}
          {product.stock > 0
            ? `${product.stock} available in this collection`
            : 'Currently unavailable'}
        </div>
        <div className="detail-actions">
          <div className="quantity-control">
            <button
              aria-label="Decrease quantity"
              disabled={quantity <= 1}
              onClick={() => setQuantity(quantity - 1)}
            >
              <Icon name="minus" size={14} />
            </button>
            <span>{quantity}</span>
            <button
              aria-label="Increase quantity"
              disabled={quantity >= maximumQuantity}
              onClick={() => setQuantity(quantity + 1)}
            >
              <Icon name="plus" size={14} />
            </button>
          </div>
          <button
            className="button button-dark"
            disabled={!product.stock}
            onClick={() => onAdd(product, quantity)}
          >
            Add to bag <Icon name="bag" size={17} />
          </button>
        </div>
        <p className="fine-print">
          Fictional product · Demo store · No payment collected
        </p>
      </div>
    </div>
  );
}
