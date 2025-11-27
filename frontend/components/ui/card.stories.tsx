/**
 * Card Stories (Issue #93 - Option D: Storybook)
 *
 * Interactive documentation for the Shadcn Card component
 * Showcases card layouts and compositions
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './card';
import { Button } from './button';
import { Bell, Mail, User } from 'lucide-react';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Versatile container component for grouping related content. Includes header, content, and footer sections.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Card>;

// Basic Card
export const Default: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This is the card content area. You can put any content here.
        </p>
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  ),
};

// Simple Card (No Footer)
export const SimpleCard: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>You have 3 unread messages.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm">Message from John Doe</p>
          <p className="text-sm">Message from Jane Smith</p>
          <p className="text-sm">Message from Bob Johnson</p>
        </div>
      </CardContent>
    </Card>
  ),
};

// Card with Icon
export const WithIcon: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-primary p-3">
            <Bell className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Manage your notification preferences</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          You will receive notifications for new messages, job matches, and application updates.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline">Configure</Button>
      </CardFooter>
    </Card>
  ),
};

// Stats Card
export const StatsCard: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader className="pb-2">
        <CardDescription>Total Applications</CardDescription>
        <CardTitle className="text-4xl">245</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground">
          +12% from last month
        </div>
      </CardContent>
    </Card>
  ),
};

// Profile Card
export const ProfileCard: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="rounded-full bg-primary p-4">
            <User className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>John Doe</CardTitle>
            <CardDescription>Senior Frontend Engineer</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>john.doe@example.com</span>
          </div>
          <div className="mt-4">
            <p className="text-muted-foreground">
              Experienced developer with 8+ years in React, TypeScript, and modern web technologies.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button>View Profile</Button>
        <Button variant="outline">Message</Button>
      </CardFooter>
    </Card>
  ),
};

// Form Card
export const FormCard: Story = {
  render: () => (
    <Card className="w-96">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Enter your details to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              placeholder="john@example.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full">Sign Up</Button>
      </CardFooter>
    </Card>
  ),
};

// Card Grid
export const CardGrid: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Applications</CardDescription>
          <CardTitle className="text-3xl">142</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            +8% from last week
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Interviews</CardDescription>
          <CardTitle className="text-3xl">23</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            +15% from last week
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Offers</CardDescription>
          <CardTitle className="text-3xl">5</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            +2 from last week
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Avg Response Time</CardDescription>
          <CardTitle className="text-3xl">2.4d</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground">
            -12% from last week
          </div>
        </CardContent>
      </Card>
    </div>
  ),
};

// Minimal Card
export const Minimal: Story = {
  render: () => (
    <Card className="w-96">
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">
          This is a minimal card with just content, no header or footer.
        </p>
      </CardContent>
    </Card>
  ),
};

// Interactive Card
export const Interactive: Story = {
  render: () => (
    <Card className="w-96 cursor-pointer transition-all hover:shadow-lg hover:border-primary">
      <CardHeader>
        <CardTitle>Senior Frontend Engineer</CardTitle>
        <CardDescription>TechCorp Inc. • San Francisco, CA</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Join our team to build next-generation web applications with React and TypeScript.
        </p>
        <div className="mt-4 flex gap-2">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            Remote
          </span>
          <span className="inline-flex items-center rounded-full bg-accent-500/10 px-2.5 py-0.5 text-xs font-semibold text-accent-500">
            Full-time
          </span>
        </div>
      </CardContent>
    </Card>
  ),
};
