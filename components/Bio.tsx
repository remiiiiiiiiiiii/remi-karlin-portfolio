/** Homepage about block: one line of copy and a short details list. The full story lives on /about. */
export default function Bio() {
  return (
    <section className="bio" id="about" aria-label="About">
      <p className="bio-line">
        Remi Karlin is an art director based in Paris, most recently at Havas Play. He builds brand identities and campaigns, and shoots, edits and grades the films and photographs that carry them.
      </p>
      <dl className="bio-details">
        <dt className="label">Based</dt>
        <dd>Paris</dd>
        <dt className="label">Camera</dt>
        <dd>
          Lumix S5II · Sony FX3
        </dd>
        <dt className="label">Post</dt>
        <dd>
          DaVinci Resolve
          <small>Color · Edit · Finish</small>
        </dd>
        <dt className="label">Email</dt>
        <dd>
          <a className="u" href="mailto:remikarlin@gmail.com">
            remikarlin@gmail.com
          </a>
        </dd>
      </dl>
    </section>
  );
}
