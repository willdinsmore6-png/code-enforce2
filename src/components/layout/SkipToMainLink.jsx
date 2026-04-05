/**
 * WCAG 2.4.1 Bypass Blocks — first focusable control on public / standalone pages.
 * Pair with a <main id="main-content" tabIndex={-1}> landmark.
 */
export function SkipToMainLink() {
  return (
    <a href="#main-content" className="skip-to-main">
      Skip to main content
    </a>
  );
}

/**
 * Wraps public routes that do not use AppLayout so skip + main landmark exist.
 */
export function PublicPageShell({ children, className, mainClassName }) {
  return (
    <div className={className}>
      <SkipToMainLink />
      <main
        id="main-content"
        tabIndex={-1}
        className={mainClassName ?? 'outline-none min-h-dvh'}
      >
        {children}
      </main>
    </div>
  );
}
