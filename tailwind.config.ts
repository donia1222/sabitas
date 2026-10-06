import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
  			display: ['var(--font-display)', 'Georgia', 'serif'],
  			mono: ['var(--font-mono)', 'ui-monospace', 'monospace']
  		},
  		colors: {
  			// ---------------------------------------------------------------
  			// Paleta de Sabitas. Todo el sitio publico usa estos tokens, asi
  			// que para recolorear la tienda entera basta con tocar este bloque.
  			//
  			// Los violetas estan sacados de las maquetas (#704898) y coinciden
  			// casi exactos con los de su web actual (#6b4f93): es su color, no
  			// uno nuevo. El rosa es el acento, no el protagonista.
  			// ---------------------------------------------------------------
  			brand: {
  				DEFAULT: '#6B4F93',   // el lila de Sabitas: botones, precios, enlaces
  				mid:     '#8A6BB0',
  				dark:    '#553F76',   // hover de los botones de marca
  				deep:    '#3B2B4D',   // fondos oscuros
  				soft:    '#B79AD6',   // lila claro sobre foto
  				pale:    '#C9B6E4',
  				tint:    '#ECE2F7',   // chips y estados activos
  				wash:    '#FBF7FB'    // fondos de seccion muy suaves
  			},
  			// Ojo: 'accent' ya lo usa shadcn/ui para los estados hover de menus
  			// y selects. El acento de la marca vive aparte, como 'highlight'.
  			highlight: {
  				DEFAULT: '#E07BA8',   // rosa: novedades, destacados, corazones
  				dark:    '#C25A8A',
  				soft:    '#F0C7D8',
  				tint:    '#FDF2F7'
  			},
  			ink: {
  				DEFAULT: '#3B2B46',
  				deep:    '#2A1F33'    // superficies oscuras (footer, cabeceras)
  			},
  			canvas: '#FCFAFD',        // papel: fondo general fuera del blanco
  			// escala neutra con una gota de lila: un gris puro al lado de este
  			// violeta se ve sucio, y se nota sobre todo en los textos de apoyo
  			n: {
  				'950': '#140F1A',
  				'900': '#2A1F33',
  				'800': '#3B2B46',
  				'700': '#55496A',
  				'600': '#6E6382',
  				'500': '#7D758D',
  				'400': '#9B93A9',
  				'300': '#B6AEC4',
  				'250': '#CCC5D6',
  				'200': '#DED7E6',
  				'150': '#EAE4F0',
  				'100': '#F3EFF7',
  				'50':  '#FAF8FC'
  			},
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: { height: '0' },
  				to: { height: 'var(--radix-accordion-content-height)' }
  			},
  			'accordion-up': {
  				from: { height: 'var(--radix-accordion-content-height)' },
  				to: { height: '0' }
  			},
  			'float': {
  				'0%, 100%': { transform: 'translateY(0px)' },
  				'50%': { transform: 'translateY(-8px)' }
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'float': 'float 6s ease-in-out infinite',
  			'float-reverse': 'float 4s ease-in-out infinite reverse'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
