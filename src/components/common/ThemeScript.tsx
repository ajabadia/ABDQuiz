'use client';

/**
 * 🌓 ThemeScript: Centralized client-side theme initialization
 * Safely loads the user's preferred theme from localStorage prior to full rendering,
 * preventing flash of unstyled content (FOUC).
 */
export function ThemeScript() {
  const code = `
    try {
      var theme = localStorage.getItem('theme') || 'dark';
      if (theme === 'system') {
        var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.className = isDark ? 'dark' : 'light';
      } else {
        document.documentElement.className = theme;
      }
    } catch (e) {}
  `;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
