'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#fafafa',
          }}
        >
          <div
            style={{
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              padding: '32px',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              backgroundColor: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                margin: '0 auto 24px',
                borderRadius: '50%',
                backgroundColor: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
              }}
            >
              ⚠
            </div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 700,
                margin: '0 0 8px',
                color: '#111827',
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: '0 0 24px',
                lineHeight: 1.5,
              }}
            >
              A critical error occurred. Please try again or reload the page.
            </p>
            {error.digest && (
              <p
                style={{
                  fontSize: '12px',
                  color: '#9ca3af',
                  margin: '0 0 24px',
                }}
              >
                Error ID:{' '}
                <code
                  style={{
                    backgroundColor: '#f3f4f6',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {error.digest}
                </code>
              </p>
            )}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <button
                onClick={reset}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#ffffff',
                  backgroundColor: '#111827',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  width: '100%',
                }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
