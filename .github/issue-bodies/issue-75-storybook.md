## 📚 Issue #75: Storybook Documentation & Visual Testing

**Phase:** 1 - Foundation
**Priority:** P0 (Must Have - MVP)
**Estimated Effort:** 1 week
**Dependencies:** Issue #73 (Shadcn/ui), Issue #74 (Custom Components)

---

## 📋 Overview

Set up Storybook as the component documentation and visual testing platform for HireFlux. Create comprehensive stories for all base and domain-specific components, enabling isolated development, visual regression testing, and design system documentation.

## 🎯 Objectives

- Install and configure Storybook 7+ for Next.js 14
- Set up Chromatic for visual regression testing
- Create stories for 20 Shadcn/ui components (Issue #73)
- Create stories for 10 custom domain components (Issue #74)
- Configure accessibility addon (axe-core)
- Implement design token documentation
- Set up automated visual testing in CI/CD

## 🔧 Technical Requirements

### Installation

```bash
npx storybook@latest init
```

**Package Configuration:**
```json
{
  "devDependencies": {
    "@storybook/addon-essentials": "^7.6.0",
    "@storybook/addon-a11y": "^7.6.0",
    "@storybook/addon-interactions": "^7.6.0",
    "@storybook/addon-links": "^7.6.0",
    "@storybook/addon-themes": "^7.6.0",
    "@storybook/nextjs": "^7.6.0",
    "@storybook/react": "^7.6.0",
    "@storybook/testing-library": "^0.2.0",
    "chromatic": "^10.0.0",
    "storybook": "^7.6.0"
  }
}
```

### Storybook Configuration

**`.storybook/main.ts`**
```typescript
import type { StorybookConfig } from "@storybook/nextjs";

const config: StorybookConfig = {
  stories: [
    "../components/**/*.stories.@(js|jsx|ts|tsx)",
    "../app/**/*.stories.@(js|jsx|ts|tsx)"
  ],
  addons: [
    "@storybook/addon-essentials",
    "@storybook/addon-a11y",
    "@storybook/addon-interactions",
    "@storybook/addon-themes"
  ],
  framework: {
    name: "@storybook/nextjs",
    options: {}
  },
  docs: {
    autodocs: "tag"
  },
  staticDirs: ["../public"]
};

export default config;
```

**`.storybook/preview.ts`**
```typescript
import type { Preview } from "@storybook/react";
import "../app/globals.css";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/
      }
    },
    a11y: {
      config: {
        rules: [
          {
            id: "color-contrast",
            enabled: true
          }
        ]
      }
    }
  },
  decorators: [
    (Story) => (
      <div style={{ margin: "3rem" }}>
        <Story />
      </div>
    )
  ]
};

export default preview;
```

## 📖 Story Requirements

### Base Component Stories (20 from Issue #73)

**Example: Button.stories.tsx**
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "ghost", "link", "danger"]
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon"]
    }
  }
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: "Click me",
    variant: "default"
  }
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="danger">Danger</Button>
    </div>
  )
};

export const Disabled: Story = {
  args: {
    children: "Disabled",
    disabled: true
  }
};

export const WithIcon: Story = {
  render: () => (
    <Button>
      <PlusIcon className="mr-2 h-4 w-4" />
      Add item
    </Button>
  )
};
```

### Domain Component Stories (10 from Issue #74)

**Example: FitIndexBadge.stories.tsx**
```tsx
import type { Meta, StoryObj } from "@storybook/react";
import { FitIndexBadge } from "@/components/domain/FitIndexBadge";

const meta: Meta<typeof FitIndexBadge> = {
  title: "Domain/FitIndexBadge",
  component: FitIndexBadge,
  tags: ["autodocs"],
  argTypes: {
    score: {
      control: { type: "range", min: 0, max: 100, step: 1 }
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"]
    },
    variant: {
      control: "select",
      options: ["job-seeker", "employer"]
    }
  }
};

export default meta;
type Story = StoryObj<typeof FitIndexBadge>;

export const ExcellentFit: Story = {
  args: {
    score: 95,
    size: "lg",
    showLabel: true
  }
};

export const AllScoreRanges: Story = {
  render: () => (
    <div className="flex gap-4 flex-wrap">
      <FitIndexBadge score={95} showLabel={true} />
      <FitIndexBadge score={82} showLabel={true} />
      <FitIndexBadge score={67} showLabel={true} />
      <FitIndexBadge score={48} showLabel={true} />
      <FitIndexBadge score={23} showLabel={true} />
    </div>
  )
};

export const Sizes: Story = {
  render: () => (
    <div className="flex gap-4 items-center">
      <FitIndexBadge score={87} size="sm" />
      <FitIndexBadge score={87} size="md" />
      <FitIndexBadge score={87} size="lg" />
    </div>
  )
};
```

### Design Token Documentation

**DesignTokens.stories.tsx**
```tsx
import type { Meta } from "@storybook/react";

const meta: Meta = {
  title: "Design System/Tokens",
  parameters: {
    layout: "fullscreen"
  }
};

export default meta;

export const Colors = () => (
  <div className="p-8">
    <h2 className="text-3xl font-bold mb-6">Color Palette</h2>

    <h3 className="text-xl font-semibold mb-4">Primary (AI/Tech)</h3>
    <div className="grid grid-cols-6 gap-4 mb-8">
      <ColorSwatch name="primary-50" hex="#F0F9FF" />
      <ColorSwatch name="primary-100" hex="#E0F2FE" />
      <ColorSwatch name="primary-500" hex="#0EA5E9" />
      <ColorSwatch name="primary-600" hex="#0284C7" />
      <ColorSwatch name="primary-700" hex="#0369A1" />
      <ColorSwatch name="primary-900" hex="#0C4A6E" />
    </div>
    {/* ... more color groups ... */}
  </div>
);

export const Typography = () => (
  <div className="p-8">
    <h2 className="text-4xl font-bold mb-8">Typography Scale</h2>
    <div className="space-y-4">
      <p className="text-xs">Extra Small (xs): 12px</p>
      <p className="text-sm">Small (sm): 14px</p>
      <p className="text-base">Base: 16px</p>
      <p className="text-lg">Large (lg): 18px</p>
      <p className="text-xl">Extra Large (xl): 20px</p>
      <p className="text-2xl">2XL: 24px</p>
      <p className="text-3xl">3XL: 30px</p>
      <p className="text-4xl">4XL: 36px</p>
    </div>
  </div>
);

export const Spacing = () => (
  <div className="p-8">
    <h2 className="text-3xl font-bold mb-8">Spacing System (4px grid)</h2>
    <div className="space-y-4">
      <SpacingExample size="1" px="4px" />
      <SpacingExample size="2" px="8px" />
      <SpacingExample size="3" px="12px" />
      <SpacingExample size="4" px="16px" />
      <SpacingExample size="6" px="24px" />
      <SpacingExample size="8" px="32px" />
      <SpacingExample size="12" px="48px" />
      <SpacingExample size="16" px="64px" />
    </div>
  </div>
);
```

## 🔄 Chromatic Visual Testing

**Setup:**
```bash
npm install --save-dev chromatic
npx chromatic --project-token=<token>
```

**chromatic.yml (CI/CD)**
```yaml
name: Chromatic

on: push

jobs:
  visual-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build-storybook
      - uses: chromaui/action@v1
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          buildScriptName: build-storybook
```

## 📁 Files to Create/Modify

```
frontend/
├── .storybook/
│   ├── main.ts                   # Storybook config
│   ├── preview.ts                # Global decorators
│   └── theme.ts                  # Custom theme
├── components/
│   ├── ui/
│   │   └── *.stories.tsx         # 20 base component stories
│   └── domain/
│       └── *.stories.tsx         # 10 domain component stories
├── stories/
│   ├── DesignTokens.stories.tsx  # Color/typography docs
│   ├── Introduction.stories.mdx  # Welcome page
│   └── Guidelines.stories.mdx    # Component guidelines
├── .github/
│   └── workflows/
│       └── chromatic.yml         # Visual testing CI
└── chromatic.config.json         # Chromatic settings
```

## ✅ Acceptance Criteria

- [ ] Storybook 7+ installed and running (`npm run storybook`)
- [ ] All 20 Shadcn/ui components have stories
- [ ] All 10 domain components have stories
- [ ] Design token documentation (colors, typography, spacing)
- [ ] Accessibility addon enabled and passing
- [ ] Interaction tests for stateful components
- [ ] Chromatic integration working
- [ ] Visual regression tests running in CI/CD
- [ ] Dark mode toggle working in Storybook
- [ ] Mobile viewport testing available
- [ ] Component prop documentation auto-generated
- [ ] Search functionality working
- [ ] Published Storybook URL available for team

## 🧪 Testing Requirements

- [ ] All stories render without errors
- [ ] Accessibility violations < 5 (axe-core)
- [ ] Visual snapshots captured for all stories
- [ ] Interaction tests pass (click, hover, focus)
- [ ] Mobile viewport stories (375px, 768px, 1024px)
- [ ] Dark mode stories render correctly
- [ ] No console warnings/errors in Storybook

## 📚 References

- [Storybook for Next.js](https://storybook.js.org/docs/react/get-started/nextjs)
- [Chromatic Documentation](https://www.chromatic.com/docs/)
- [Storybook Accessibility Addon](https://storybook.js.org/addons/@storybook/addon-a11y)
- [Component Story Format 3.0](https://storybook.js.org/docs/react/api/csf)
- UX_UI_IMPLEMENTATION_ROADMAP.md (lines 371-400)

## 🎨 Design Philosophy

**Documentation as Code**
- Stories are the source of truth
- Visual documentation stays in sync
- No separate design system website needed

**Isolated Development**
- Build components in isolation
- Test edge cases easily
- Share with designers for feedback

**Visual Regression**
- Catch unintended changes early
- Review UI changes in pull requests
- Maintain visual consistency

---

**Labels:** `ux`, `documentation`, `testing`, `p0`, `phase-1`, `foundation`
**Milestone:** Phase 1 - Foundation
