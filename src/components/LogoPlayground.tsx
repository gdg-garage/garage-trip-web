/**
 * LogoPlayground — contenteditable logo sandbox.
 * React island with client:visible (only hydrated when scrolled into view).
 */
export default function LogoPlayground() {
  return (
    <div className="logo-playground-container">
      <div className="logo-playground">
        <div
          className="logo logo-playground-text desktop-visible"
          contentEditable
          suppressContentEditableWarning
        >
          <span className="monospace">
            garage::<span className="secondary-color">&#10033;</span>
          </span>
        </div>
        <div className="logo logo-playground-text desktop-invisible">
          <span className="monospace">
            garage::<span className="secondary-color">&#10033;</span>
          </span>
        </div>
      </div>
    </div>
  );
}
