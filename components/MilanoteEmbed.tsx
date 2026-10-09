type Props = {
  /** iframe URL from Milanote's embed code. Empty = no frame yet. */
  src: string;
  title: string;
  /** Normal board link, shown as "Open the board" under the frame. */
  boardUrl?: string;
};

export default function MilanoteEmbed({ src, title, boardUrl }: Props) {
  return (
    <div className="mb-embed">
      {src && (
        <div className="mb-frame">
          <iframe
            src={src}
            title={title}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
      <div className="mb-caption">
        <span>Mood board on Milanote</span>
        {boardUrl && (
          <a href={boardUrl} target="_blank" rel="noreferrer">
            Open the board
          </a>
        )}
      </div>
    </div>
  );
}
