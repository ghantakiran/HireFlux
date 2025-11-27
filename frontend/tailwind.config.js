/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				'50': 'var(--primary-50)',
  				'100': 'var(--primary-100)',
  				'500': 'var(--primary-500)',
  				'600': 'var(--primary-600)',
  				'700': 'var(--primary-700)',
  				'900': 'var(--primary-900)',
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				'50': 'var(--accent-50)',
  				'500': 'var(--accent-500)',
  				'700': 'var(--accent-700)',
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			success: {
  				'50': 'var(--success-50)',
  				'500': 'var(--success-500)',
  				'700': 'var(--success-700)'
  			},
  			error: 'var(--error)',
  			warning: 'var(--warning)',
  			info: 'var(--info)',
  			gray: {
  				'50': 'var(--gray-50)',
  				'200': 'var(--gray-200)',
  				'600': 'var(--gray-600)',
  				'900': 'var(--gray-900)'
  			}
  		},
  		spacing: {
  			'1': 'var(--spacing-1)',
  			'2': 'var(--spacing-2)',
  			'3': 'var(--spacing-3)',
  			'4': 'var(--spacing-4)',
  			'6': 'var(--spacing-6)',
  			'8': 'var(--spacing-8)',
  			'12': 'var(--spacing-12)',
  			'16': 'var(--spacing-16)'
  		},
  		borderRadius: {
  			sm: 'var(--radius-sm)',
  			DEFAULT: 'var(--radius)',
  			md: 'var(--radius-md)',
  			lg: 'var(--radius-lg)',
  			full: 'var(--radius-full)'
  		},
  		boxShadow: {
  			sm: 'var(--shadow-sm)',
  			DEFAULT: 'var(--shadow)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)'
  		},
  		fontFamily: {
  			sans: 'var(--font-sans)',
  			mono: 'var(--font-mono)'
  		},
  		fontSize: {
  			xs: 'var(--text-xs)',
  			sm: 'var(--text-sm)',
  			base: 'var(--text-base)',
  			lg: 'var(--text-lg)',
  			xl: 'var(--text-xl)',
  			'2xl': 'var(--text-2xl)',
  			'3xl': 'var(--text-3xl)',
  			'4xl': 'var(--text-4xl)'
  		},
  		transitionDuration: {
  			fast: 'var(--duration-fast)',
  			normal: 'var(--duration-normal)',
  			slow: 'var(--duration-slow)'
  		},
  		transitionTimingFunction: {
  			DEFAULT: 'var(--ease-default)',
  			bounce: 'var(--ease-bounce)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require('tailwindcss-animate')],
};
