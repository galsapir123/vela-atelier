import { money } from '../api';

export function JournalStory({ story }) {
  const automatic = story === 'automatic';
  return (
    <article className="story-content">
      <span className="eyebrow">NOTES FROM THE ATELIER / {automatic ? '01' : '02'}</span>
      <h2>{automatic ? 'A little movement.' : 'Good things are kept.'}</h2>
      <p className="story-intro">
        {automatic
          ? 'The quiet choreography inside an automatic watch.'
          : 'A few small habits for something you’ll wear often.'}
      </p>
      {automatic ? (
        <>
          <h3>Powered by your day</h3>
          <p>
            An automatic movement uses a rotating weight, called a rotor, to wind its
            mainspring as you move. That stored energy powers the hands through a
            carefully arranged train of gears.
          </p>
          <h3>A moment of stillness</h3>
          <p>
            The power reserve describes how long a fully wound movement can run while the
            watch is off your wrist. If it stops, follow the maker’s winding instructions
            and set the time before wearing it again.
          </p>
          <h3>Beautifully mechanical</h3>
          <p>
            Mechanical watches do not keep time with the same precision as quartz watches.
            Their appeal lies in their engineering, rhythm, and the human connection to a
            small moving object.
          </p>
        </>
      ) : (
        <>
          <h3>A gentle clean</h3>
          <p>
            A soft, dry microfiber cloth is a good starting point for cleaning the case
            and crystal. Avoid solvents, abrasives, and strong magnetic fields.
          </p>
          <h3>Mind the strap</h3>
          <p>
            Leather develops character with wear. Keep it away from prolonged water
            exposure, perfume, and direct heat. Let it dry naturally if it becomes damp.
          </p>
          <h3>Know its limits</h3>
          <p>
            Water-resistance ratings are not a guarantee for every activity. Follow the
            manufacturer’s guidance, never operate a crown underwater, and have seals
            checked as recommended.
          </p>
        </>
      )}
      <p className="fine-print">
        An editorial note from our fictional atelier. Product details in this demo are
        illustrative.
      </p>
    </article>
  );
}

export function StoreInformation({ shippingPolicy }) {
  return (
    <article className="story-content">
      <span className="eyebrow">AT YOUR SERVICE</span>
      <h2>A little clarity.</h2>
      <h3>A working store concept</h3>
      <p>
        VELA Atelier is a fictional luxury watch store. You can browse, save favorites,
        build a bag, and place a demo order. Orders and subscriptions are stored in
        SQLite. No payments, shipments, or emails are sent.
      </p>
      <h3>Delivery in this demo</h3>
      <p>
        Delivery is {money(shippingPolicy.standard)}, or complimentary on orders of{' '}
        {money(shippingPolicy.freeAbove)} and above. All prices are in USD. Taxes and
        duties are not calculated; the displayed total is the complete demo total.
      </p>
      <h3>Your details</h3>
      <p>
        Use sample information at checkout. The store saves the delivery details you enter
        to its database. Your bag and saved watches are kept in your browser. There are no
        analytics or advertising cookies.
      </p>
      <h3>Product imagery</h3>
      <p>
        The watches, specifications, and collection are fictional. Product photographs
        were created for this concept.
      </p>
    </article>
  );
}
