import { useEffect, useState } from 'react';
import Icon from './Icon';

function GenevaTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return (
    <span className="geneva-time">
      <i />
      {new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Zurich',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(time)}{' '}
      <small>GENEVA</small>
    </span>
  );
}

export default function Hero({
  heroRef,
  hero,
  heroIndex,
  productCount,
  setHeroIndex,
  onExplore,
  onProduct,
}) {
  return (
    <section className="hero" ref={heroRef} aria-labelledby="hero-title">
      <div className="hero-copy">
        <div className="eyebrow">
          <span className="tiny-star">✳</span> IN GOOD TIME, IN YOUR OWN TIME.
        </div>
        <h1 id="hero-title">
          Time,
          <br />
          <em>beautifully</em>
          <br />
          kept.
        </h1>
        <p>
          For the days you’ll remember.
          <br />
          And the moments in between.
        </p>
        <button className="button button-cream" onClick={() => onExplore()}>
          Discover the collection <Icon name="arrow" />
        </button>
        <div className="hero-copy-footer">
          <span>
            OBJECTS OF INTENTION.
            <br />
            MADE FOR YOUR EVERYDAY.
          </span>
          <span className="small-mark">V / A</span>
        </div>
      </div>
      <div className={`hero-visual ${hero?.imageClass || 'solstice'}`}>
        <img
          key={hero?.id || 'hero'}
          className="hero-image"
          src={hero?.image || '/images/solstice.webp'}
          alt={hero ? `${hero.name}, ${hero.color}` : 'Rose gold watch on burgundy stone'}
          fetchPriority="high"
        />
        <div className="hero-image-top">
          <span>THE CONSIDERED COLLECTION / 2026</span>
          <GenevaTime />
        </div>
        <div className="hero-product-caption">
          <div>
            <span className="eyebrow">{hero?.badge || 'THE SIGNATURE'}</span>
            <button disabled={!hero} onClick={() => onProduct(hero)}>
              {hero?.name || 'Solstice'} <span>↗</span>
            </button>
            <span className="hero-product-meta">
              {hero?.caseSize || '38 mm'} · {hero?.color || 'Champagne / rose gold'}
            </span>
          </div>
          <div className="hero-pagination">
            <button
              aria-label="Previous featured watch"
              disabled={!productCount}
              onClick={() => setHeroIndex((heroIndex - 1 + productCount) % productCount)}
            >
              ←
            </button>
            <span>
              0{heroIndex + 1} <i>/ 03</i>
            </span>
            <button
              aria-label="Next featured watch"
              disabled={!productCount}
              onClick={() => setHeroIndex((heroIndex + 1) % productCount)}
            >
              →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
