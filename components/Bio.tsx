/** Homepage about block: one line of copy and a short details list. The full story lives on /about. */
export default function Bio() {
  return (
    <section className="bio" id="about" aria-label="About">
      <p className="bio-line">
        Remi Karlin is a filmmaker and cinematographer working between Hong Kong and Paris, with a focus on light,
        texture and the quiet rhythm of a place. He shoots, edits and grades end to end.
      </p>
      <dl className="bio-details">
        <dt className="label">Based</dt>
        <dd>Hong Kong / Paris</dd>
        <dt className="label">Camera</dt>
        <dd>
          Lumix S5II
          <small>Lumix 20–60mm f/3.5–5.6</small>
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
