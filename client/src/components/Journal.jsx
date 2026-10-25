import Icon from './Icon';

export default function Journal({ onOpenStory }) {
  return (
    <section className="journal section-space" id="journal">
      <div className="section-label">
        <span>03 / NOTES FROM THE ATELIER</span>
        <span>FOR THE CURIOUS.</span>
      </div>
      <div className="journal-heading">
        <h2>
          A moment
          <br />
          <em>well spent.</em>
        </h2>
        <p>
          A few small things
          <br />
          worth knowing.
        </p>
      </div>
      <div className="journal-grid">
        <button className="journal-card" onClick={() => onOpenStory('automatic')}>
          <div className="journal-art mechanical-art">
            <div className="mechanical-ring ring-one" />
            <div className="mechanical-ring ring-two" />
            <div className="mechanical-ring ring-three" />
            <span>
              AUTOMATIC
              <br />
              <em>by nature.</em>
            </span>
            <i>01</i>
          </div>
          <div className="journal-card-label">
            <span>THE INNER WORLD / 4 MIN READ</span>
            <Icon name="arrow" />
          </div>
          <h3>
            A little movement.
            <br />A remarkable mechanism.
          </h3>
        </button>
        <button className="journal-card" onClick={() => onOpenStory('care')}>
          <div className="journal-art care-art">
            <img
              src="/images/nocturne.webp"
              alt="Stainless steel watch detail"
              loading="lazy"
            />
            <span>
              GOOD THINGS
              <br />
              <em>are kept.</em>
            </span>
            <i>02</i>
          </div>
          <div className="journal-card-label">
            <span>THE EVERYDAY RITUAL / 3 MIN READ</span>
            <Icon name="arrow" />
          </div>
          <h3>
            Take your time.
            <br />
            Take good care.
          </h3>
        </button>
      </div>
    </section>
  );
}
