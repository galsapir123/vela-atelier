import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest, money } from './api';
import { useStoredState } from './hooks/useStoredState';
import Icon from './components/Icon';
import Hero from './components/Hero';
import Journal from './components/Journal';
import { JournalStory, StoreInformation } from './components/Information';
import Modal from './components/Modal';
import ProductDetails from './components/ProductDetails';
import Bag from './components/Bag';
import Checkout from './components/Checkout';
import { OrderLookup, OrderReceipt } from './components/Order';

const validBag = (value) =>
  Array.isArray(value) &&
  value.length <= 3 &&
  new Set(value.map((item) => item?.productId)).size === value.length &&
  value.every(
    (item) =>
      typeof item?.productId === 'string' &&
      Number.isInteger(item.quantity) &&
      item.quantity >= 1 &&
      item.quantity <= 5,
  );
const validFavorites = (value) =>
  Array.isArray(value) &&
  value.length <= 100 &&
  value.every((id) => typeof id === 'string');

function Wordmark() {
  return (
    <span className="wordmark">
      VELA<span>ATELIER</span>
    </span>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [shippingPolicy, setShippingPolicy] = useState({
    freeAbove: 250000,
    standard: 2500,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [bag, setBag] = useStoredState('vela.bag.v1', [], validBag);
  const [favorites, setFavorites] = useStoredState(
    'vela.favorites.v1',
    [],
    validFavorites,
  );
  const [overlay, setOverlay] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState('All timepieces');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('curated');
  const [heroIndex, setHeroIndex] = useState(0);
  const [toast, setToast] = useState('');
  const [newsletterState, setNewsletterState] = useState({
    pending: false,
    message: '',
    error: false,
  });
  const searchRef = useRef(null);
  const heroRef = useRef(null);

  const refreshCatalog = useCallback(async () => {
    setLoadError('');
    try {
      const data = await apiRequest('/products');
      setProducts(data.products);
      setShippingPolicy(data.shipping);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // One scheduled CSS update per frame keeps the hero parallax inexpensive.
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    function update() {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        if (heroRef.current)
          heroRef.current.style.setProperty(
            '--parallax',
            preference.matches ? '0px' : `${Math.min(window.scrollY, 900) * 0.16}px`,
          );
        frame = null;
      });
    }
    window.addEventListener('scroll', update, { passive: true });
    preference.addEventListener('change', update);
    update();
    return () => {
      window.removeEventListener('scroll', update);
      preference.removeEventListener('change', update);
      cancelAnimationFrame(frame);
    };
  }, []);

  const bagItems = bag
    .map((item) => ({
      ...item,
      product: products.find((product) => product.id === item.productId),
    }))
    .filter((item) => item.product);
  const bagCount = bagItems.reduce((total, item) => total + item.quantity, 0);
  const hero = products[heroIndex] || null;
  const visibleProducts = useMemo(() => {
    const result = products.filter((product) => {
      const matchesCategory =
        category === 'All timepieces' ||
        (category === 'Saved'
          ? favorites.includes(product.id)
          : product.collection === category);
      const matchesSearch =
        `${product.name} ${product.color} ${product.collection} ${product.material}`
          .toLowerCase()
          .includes(search.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });
    if (sort === 'price-ascending') result.sort((a, b) => a.price - b.price);
    if (sort === 'price-descending') result.sort((a, b) => b.price - a.price);
    return result;
  }, [products, category, search, sort, favorites]);

  function addToBag(product, quantity = 1) {
    const existing = bag.find((item) => item.productId === product.id);
    const nextQuantity = (existing?.quantity || 0) + quantity;
    const maximum = Math.min(5, product.stock);
    if (nextQuantity > maximum) {
      setToast(`You can add up to ${maximum} ${product.name} watches.`);
      return false;
    }
    setBag((current) =>
      existing
        ? current.map((item) =>
            item.productId === product.id ? { ...item, quantity: nextQuantity } : item,
          )
        : [...current, { productId: product.id, quantity }],
    );
    setToast(`${product.name} added to your bag.`);
    return true;
  }

  function toggleFavorite(productId) {
    setFavorites((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  }

  function exploreCollection(focusSearch = false) {
    setMenuOpen(false);
    document.getElementById('collection').scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
    if (focusSearch) searchRef.current?.focus({ preventScroll: true });
  }

  async function subscribe(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setNewsletterState({ pending: true, message: '', error: false });
    try {
      const result = await apiRequest('/newsletter', {
        method: 'POST',
        body: JSON.stringify({ email: new FormData(form).get('email') }),
      });
      setNewsletterState({ pending: false, message: result.message, error: false });
      form.reset();
    } catch (error) {
      setNewsletterState({ pending: false, message: error.message, error: true });
    }
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="announcement">
        <span>A LITTLE LESS ORDINARY. A LITTLE MORE FOREVER.</span>
        <button onClick={() => setOverlay({ type: 'lookup' })}>
          Find your order <span>↗</span>
        </button>
      </div>
      <header className="site-header">
        <a className="logo-link" href="#" aria-label="VELA Atelier home">
          <Wordmark />
        </a>
        <nav
          className={menuOpen ? 'navigation is-open' : 'navigation'}
          aria-label="Main navigation"
        >
          <a href="#collection" onClick={() => setMenuOpen(false)}>
            The collection
          </a>
          <a href="#atelier" onClick={() => setMenuOpen(false)}>
            Our point of view
          </a>
          <a href="#journal" onClick={() => setMenuOpen(false)}>
            The journal
          </a>
        </nav>
        <div className="header-actions">
          <button
            className="icon-button search-trigger"
            aria-label="Search watches"
            onClick={() => exploreCollection(true)}
          >
            <Icon name="search" />
          </button>
          <button
            className="icon-button"
            aria-label={`Saved watches (${favorites.length})`}
            onClick={() => {
              setCategory('Saved');
              exploreCollection();
            }}
          >
            <Icon name="heart" />
            <span className="saved-count">{favorites.length || ''}</span>
          </button>
          <button
            className="bag-trigger"
            onClick={() => setOverlay({ type: 'bag' })}
            aria-label={`Open bag (${bagCount})`}
          >
            <Icon name="bag" />
            <span className="bag-label">Bag</span>
            <span className="bag-count">{bagCount}</span>
          </button>
          <button
            className="icon-button menu-trigger"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <Icon name={menuOpen ? 'close' : 'menu'} />
          </button>
        </div>
      </header>
      <main id="main">
        <Hero
          heroRef={heroRef}
          hero={hero}
          heroIndex={heroIndex}
          productCount={products.length}
          setHeroIndex={setHeroIndex}
          onExplore={() => exploreCollection()}
          onProduct={(product) => setOverlay({ type: 'product', product })}
        />
        <div className="brand-ribbon">
          <span>NOT JUST A WAY TO TELL TIME.</span>
          <span className="ribbon-star">✳</span>
          <span>A WAY TO SPEND IT.</span>
          <a href="#atelier">
            THE VELA PHILOSOPHY <span>↘</span>
          </a>
        </div>
        <section className="collection section-space" id="collection">
          <div className="section-label">
            <span>01 / THE COLLECTION</span>
            <span>FEWER THINGS. BETTER CHOSEN.</span>
          </div>
          <div className="collection-heading">
            <h2>
              Find your
              <br />
              <em>kind of timeless.</em>
            </h2>
            <p>
              Three distinct personalities.
              <br />
              One place on your wrist.
            </p>
          </div>
          <div className="collection-toolbar">
            <div className="filter-tabs" role="group" aria-label="Filter collection">
              {['All timepieces', 'Dress', 'Sport', 'Saved'].map((filter) => (
                <button
                  key={filter}
                  aria-pressed={category === filter}
                  onClick={() => setCategory(filter)}
                >
                  {filter}
                  {filter === 'Saved' && ` (${favorites.length})`}
                </button>
              ))}
            </div>
            <div className="collection-tools">
              <label className="search-field">
                <Icon name="search" size={16} />
                <input
                  ref={searchRef}
                  aria-label="Search the collection"
                  placeholder="Find a timepiece"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                {search && (
                  <button aria-label="Clear search" onClick={() => setSearch('')}>
                    <Icon name="close" size={13} />
                  </button>
                )}
              </label>
              <label className="sort-field">
                <span className="sr-only">Sort watches</span>
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="curated">Our selection</option>
                  <option value="price-ascending">Price: low to high</option>
                  <option value="price-descending">Price: high to low</option>
                </select>
              </label>
            </div>
          </div>
          {loading ? (
            <div className="product-grid" aria-busy="true" aria-label="Loading watches">
              {[1, 2, 3].map((number) => (
                <div className="product-skeleton" key={number} />
              ))}
            </div>
          ) : loadError ? (
            <div className="empty-state" role="alert">
              <h3>The collection is taking a moment.</h3>
              <p>{loadError}</p>
              <button
                className="button button-dark"
                onClick={() => {
                  setLoading(true);
                  refreshCatalog();
                }}
              >
                Try again <Icon name="arrow" />
              </button>
            </div>
          ) : !visibleProducts.length ? (
            <div className="empty-state">
              <h3>
                {category === 'Saved'
                  ? 'Keep the ones that move you.'
                  : 'Nothing quite like that. Yet.'}
              </h3>
              <p>
                {category === 'Saved'
                  ? 'Tap the heart on a watch to save it here.'
                  : 'Try another search or explore the full collection.'}
              </p>
              <button
                className="text-button"
                onClick={() => {
                  setCategory('All timepieces');
                  setSearch('');
                }}
              >
                View all timepieces →
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {visibleProducts.map((product, index) => (
                <article
                  className={`product-card ${product.imageClass}`}
                  key={product.id}
                >
                  <div className="product-photo">
                    <button
                      className="product-photo-link"
                      onClick={() => setOverlay({ type: 'product', product })}
                      aria-label={`Explore ${product.name}`}
                    >
                      <img
                        src={product.image}
                        alt={`${product.name}, ${product.color}`}
                        loading="lazy"
                      />
                    </button>
                    <span className="product-index">
                      0{products.findIndex((item) => item.id === product.id) + 1} / VELA
                    </span>
                    <button
                      className={`favorite-button ${favorites.includes(product.id) ? 'is-saved' : ''}`}
                      aria-label={`${favorites.includes(product.id) ? 'Unsave' : 'Save'} ${product.name}`}
                      aria-pressed={favorites.includes(product.id)}
                      onClick={() => toggleFavorite(product.id)}
                    >
                      <Icon name="heart" size={19} />
                    </button>
                    <button
                      className="quick-add"
                      disabled={product.stock === 0}
                      onClick={() => addToBag(product)}
                    >
                      {product.stock ? 'Add to bag' : 'Sold out'}
                      <Icon name="plus" size={17} />
                    </button>
                  </div>
                  <div className="product-info">
                    <div>
                      <span className="eyebrow">
                        {product.collection.toUpperCase()} / {product.caseSize}
                      </span>
                      <h3>
                        <button onClick={() => setOverlay({ type: 'product', product })}>
                          {product.name}
                        </button>
                      </h3>
                      <p>{product.color}</p>
                    </div>
                    <span className="product-price">
                      {money(product.price)}
                      <small>USD</small>
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
          <div className="collection-footnote">
            <span>AN AUTOMATIC MOVEMENT. AN ENTIRELY PERSONAL CHOICE.</span>
            <span>{visibleProducts.length} TIMEPIECES / A CONSIDERED EDIT</span>
          </div>
        </section>
        <section className="atelier" id="atelier">
          <div className="atelier-image">
            <img
              src="/images/meridian.webp"
              alt="Gold and forest-green Meridian watch on travertine"
              loading="lazy"
            />
            <span className="image-caption">THE MERIDIAN / A STUDY IN BALANCE</span>
            <span className="image-corner">VA.</span>
          </div>
          <div className="atelier-copy">
            <span className="eyebrow">02 / OUR POINT OF VIEW</span>
            <h2>
              Some things
              <br />
              are worth
              <br />
              <em>slowing down for.</em>
            </h2>
            <p>
              A beautiful watch doesn’t give you more time. It reminds you to be here for
              it.
            </p>
            <p className="muted">
              VELA is an imagined atelier built around a simple belief: the things you
              keep close should mean something. Thoughtful proportions. Materials with
              character. A little less, beautifully done.
            </p>
            <a href="#journal" className="editorial-link">
              Spend a moment with us <Icon name="arrow" />
            </a>
            <div className="atelier-signature">
              With time, <span>Vela.</span>
            </div>
          </div>
        </section>
        <section className="service-strip">
          <div>
            <Icon name="box" size={27} />
            <span>
              <strong>A considered arrival</strong>
              <small>Complimentary delivery from {money(shippingPolicy.freeAbove)}</small>
            </span>
          </div>
          <div>
            <Icon name="clock" size={27} />
            <span>
              <strong>Designed to stay</strong>
              <small>Automatic movements, enduring forms</small>
            </span>
          </div>
          <div>
            <Icon name="shield" size={27} />
            <span>
              <strong>Clarity at every step</strong>
              <small>Transparent pricing. No hidden extras.</small>
            </span>
          </div>
        </section>
        <Journal onOpenStory={(story) => setOverlay({ type: 'story', story })} />
        <section className="newsletter">
          <div>
            <span className="eyebrow">LET’S KEEP IN TOUCH</span>
            <h2>
              Good things,
              <br />
              <em>from time to time.</em>
            </h2>
          </div>
          <div className="newsletter-form-wrap">
            <p>
              Notes from the atelier. A fresh perspective.
              <br />
              Something worth opening.
            </p>
            <form onSubmit={subscribe}>
              <label className="sr-only" htmlFor="newsletter-email">
                Email address
              </label>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                placeholder="Your email address"
                required
                maxLength={254}
              />
              <button
                aria-label="Join the mailing list"
                disabled={newsletterState.pending}
              >
                {newsletterState.pending ? '…' : <Icon name="arrow" size={25} />}
              </button>
            </form>
            {newsletterState.message ? (
              <p
                className={
                  newsletterState.error
                    ? 'newsletter-feedback error-message'
                    : 'newsletter-feedback'
                }
                role="status"
              >
                {newsletterState.message}
              </p>
            ) : (
              <small>
                Demo signup. Your address is saved locally to this store’s database.
              </small>
            )}
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="footer-main">
          <a href="#" aria-label="VELA Atelier home">
            <Wordmark />
          </a>
          <p>
            Time is yours.
            <br />
            Keep it beautifully.
          </p>
          <div>
            <span className="eyebrow">THE ATELIER</span>
            <a href="#collection">All timepieces</a>
            <a href="#atelier">Our philosophy</a>
            <a href="#journal">The journal</a>
          </div>
          <div>
            <span className="eyebrow">AT YOUR SERVICE</span>
            <button onClick={() => setOverlay({ type: 'lookup' })}>
              Find your order
            </button>
            <button onClick={() => setOverlay({ type: 'information' })}>
              Delivery & care
            </button>
            <button onClick={() => setOverlay({ type: 'information' })}>
              About this store
            </button>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} VELA ATELIER</span>
          <span>A FICTIONAL LUXURY STORE. A WORKING FULL-STACK EXPERIENCE.</span>
          <span>USD / ENGLISH</span>
        </div>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" size={16} />
          <span>{toast}</span>
          <button onClick={() => setOverlay({ type: 'bag' })}>View bag ↗</button>
          <button aria-label="Dismiss notification" onClick={() => setToast('')}>
            <Icon name="close" size={14} />
          </button>
        </div>
      )}
      {overlay && (
        <Modal
          key={overlay.type}
          title={
            {
              product: 'Watch details',
              bag: 'Your bag',
              checkout: 'Checkout',
              receipt: 'Order confirmation',
              lookup: 'Find your order',
              story: 'Atelier journal',
              information: 'Store information',
            }[overlay.type]
          }
          onClose={() => setOverlay(null)}
          variant={
            overlay.type === 'bag'
              ? 'drawer'
              : overlay.type === 'checkout'
                ? 'checkout-modal'
                : overlay.type === 'product'
                  ? 'product-modal'
                  : ''
          }
        >
          {overlay.type === 'product' && (
            <ProductDetails
              product={overlay.product}
              onAdd={(product, quantity) => {
                if (addToBag(product, quantity)) setOverlay({ type: 'bag' });
              }}
            />
          )}
          {overlay.type === 'bag' && (
            <Bag
              items={bagItems}
              shippingPolicy={shippingPolicy}
              onQuantity={(id, quantity) =>
                setBag(
                  bag.map((item) =>
                    item.productId === id ? { ...item, quantity } : item,
                  ),
                )
              }
              onRemove={(id) => setBag(bag.filter((item) => item.productId !== id))}
              onCheckout={() => setOverlay({ type: 'checkout' })}
              onClose={() => {
                setOverlay(null);
                exploreCollection();
              }}
            />
          )}
          {overlay.type === 'checkout' && (
            <Checkout
              items={bagItems}
              shippingPolicy={shippingPolicy}
              onBack={() => setOverlay({ type: 'bag' })}
              onComplete={(order) => {
                setBag([]);
                setToast('');
                setOverlay({ type: 'receipt', order });
                refreshCatalog();
              }}
            />
          )}
          {overlay.type === 'receipt' && (
            <OrderReceipt order={overlay.order} onClose={() => setOverlay(null)} />
          )}
          {overlay.type === 'lookup' && (
            <OrderLookup onFound={(order) => setOverlay({ type: 'receipt', order })} />
          )}
          {overlay.type === 'story' && <JournalStory story={overlay.story} />}
          {overlay.type === 'information' && (
            <StoreInformation shippingPolicy={shippingPolicy} />
          )}
        </Modal>
      )}
    </>
  );
}
