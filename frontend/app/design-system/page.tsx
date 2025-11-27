/**
 * Design System Showcase Page
 * Issue #92: Design System Setup & Theming
 *
 * This page demonstrates all design tokens are working correctly
 */

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-extrabold text-foreground mb-2">
            HireFlux Design System
          </h1>
          <p className="text-lg text-gray-600">
            Issue #92: Design tokens, typography, colors, spacing, and more
          </p>
        </div>

        {/* Color Palette */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Color Palette</h2>

          {/* Primary Colors */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Primary (AI/Tech)</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <ColorSwatch name="Primary 50" className="bg-primary-50" />
              <ColorSwatch name="Primary 100" className="bg-primary-100" />
              <ColorSwatch name="Primary 500" className="bg-primary-500 text-white" />
              <ColorSwatch name="Primary 600" className="bg-primary-600 text-white" />
              <ColorSwatch name="Primary 700" className="bg-primary-700 text-white" />
              <ColorSwatch name="Primary 900" className="bg-primary-900 text-white" />
            </div>
          </div>

          {/* Success Colors */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Success (Growth)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <ColorSwatch name="Success 50" className="bg-success-50" />
              <ColorSwatch name="Success 500" className="bg-success-500 text-white" />
              <ColorSwatch name="Success 700" className="bg-success-700 text-white" />
            </div>
          </div>

          {/* Accent Colors */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Accent (Highlight/CTA)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <ColorSwatch name="Accent 50" className="bg-accent-50" />
              <ColorSwatch name="Accent 500" className="bg-accent-500 text-white" />
              <ColorSwatch name="Accent 700" className="bg-accent-700 text-white" />
            </div>
          </div>

          {/* Semantic Colors */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Semantic Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <ColorSwatch name="Error" className="bg-error text-white" />
              <ColorSwatch name="Warning" className="bg-warning text-white" />
              <ColorSwatch name="Info" className="bg-info text-white" />
            </div>
          </div>
        </section>

        {/* Typography */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Typography</h2>

          <div className="space-y-4 bg-card p-6 rounded-lg border">
            <div>
              <span className="text-sm text-gray-600">Text 4XL (36px)</span>
              <p className="text-4xl font-bold">The quick brown fox jumps</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Text 3XL (30px)</span>
              <p className="text-3xl font-bold">The quick brown fox jumps</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Text 2XL (24px)</span>
              <p className="text-2xl font-semibold">The quick brown fox jumps</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Text XL (20px)</span>
              <p className="text-xl">The quick brown fox jumps over the lazy dog</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Text LG (18px)</span>
              <p className="text-lg">The quick brown fox jumps over the lazy dog</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Text Base (16px)</span>
              <p className="text-base">The quick brown fox jumps over the lazy dog</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Text SM (14px)</span>
              <p className="text-sm">The quick brown fox jumps over the lazy dog</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Text XS (12px)</span>
              <p className="text-xs">The quick brown fox jumps over the lazy dog</p>
            </div>
            <div>
              <span className="text-sm text-gray-600">Monospace</span>
              <code className="font-mono block bg-gray-50 p-2 rounded">
                const greeting = "Hello, World!";
              </code>
            </div>
          </div>
        </section>

        {/* Spacing */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Spacing (4px Grid)</h2>

          <div className="space-y-4 bg-card p-6 rounded-lg border">
            {[1, 2, 3, 4, 6, 8, 12, 16].map((size) => (
              <div key={size} className="flex items-center gap-4">
                <span className="text-sm text-gray-600 w-20">Spacing {size}</span>
                <div className={`bg-primary-500 h-8 p-${size}`} style={{ width: `${size * 4}px` }} />
                <span className="text-xs text-gray-500">{size * 4}px</span>
              </div>
            ))}
          </div>
        </section>

        {/* Border Radius */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Border Radius</h2>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-card border p-4 rounded-sm text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-sm mx-auto mb-2" />
              <span className="text-sm">Small (4px)</span>
            </div>
            <div className="bg-card border p-4 rounded text-center">
              <div className="w-16 h-16 bg-primary-500 rounded mx-auto mb-2" />
              <span className="text-sm">Default (8px)</span>
            </div>
            <div className="bg-card border p-4 rounded-md text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-md mx-auto mb-2" />
              <span className="text-sm">Medium (12px)</span>
            </div>
            <div className="bg-card border p-4 rounded-lg text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-lg mx-auto mb-2" />
              <span className="text-sm">Large (16px)</span>
            </div>
            <div className="bg-card border p-4 rounded-full text-center">
              <div className="w-16 h-16 bg-primary-500 rounded-full mx-auto mb-2" />
              <span className="text-sm">Full (9999px)</span>
            </div>
          </div>
        </section>

        {/* Shadows */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Shadows (Elevation)</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-card p-6 rounded shadow-sm text-center">
              <span className="text-sm">Small (Hover)</span>
            </div>
            <div className="bg-card p-6 rounded shadow text-center">
              <span className="text-sm">Default (Cards)</span>
            </div>
            <div className="bg-card p-6 rounded shadow-md text-center">
              <span className="text-sm">Medium (Dropdowns)</span>
            </div>
            <div className="bg-card p-6 rounded shadow-lg text-center">
              <span className="text-sm">Large (Modals)</span>
            </div>
          </div>
        </section>

        {/* Animation Timing */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Animation Timing</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-primary-500 text-white px-6 py-3 rounded transition-fast hover:bg-primary-600">
              Fast (150ms)
            </button>
            <button className="bg-success-500 text-white px-6 py-3 rounded transition-normal hover:bg-success-700">
              Normal (300ms)
            </button>
            <button className="bg-accent-500 text-white px-6 py-3 rounded transition-slow hover:bg-accent-700">
              Slow (500ms)
            </button>
          </div>
        </section>

        {/* Dark Mode Toggle */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Dark Mode</h2>

          <div className="bg-card border p-6 rounded-lg">
            <p className="mb-4 text-gray-600">
              Toggle dark mode using the browser developer tools:
              <code className="block mt-2 bg-gray-50 dark:bg-gray-800 p-2 rounded font-mono text-sm">
                document.documentElement.classList.toggle('dark')
              </code>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-background border rounded">
                <h3 className="font-semibold mb-2">Current Theme</h3>
                <p className="text-sm text-muted-foreground">
                  Background adapts to light/dark mode
                </p>
              </div>
              <div className="p-4 bg-card border rounded">
                <h3 className="font-semibold mb-2">Card Component</h3>
                <p className="text-sm text-card-foreground">
                  Cards maintain readability in both modes
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ColorSwatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="space-y-2">
      <div className={`h-20 rounded border ${className} flex items-center justify-center`}>
        <span className="text-xs font-medium">{name}</span>
      </div>
    </div>
  );
}
