'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Zap, Target, FileText, Users, TrendingUp, CheckCircle, Menu, X } from 'lucide-react';
import { SkipLink } from '@/components/skip-link';

export default function HomePage() {
  // Set document title for WCAG 2.1 AA compliance (Issue #148)
  useEffect(() => {
    document.title = 'HireFlux - AI-Powered Job Application Copilot';
  }, []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Skip to Main Content */}
      <SkipLink />
      {/* Navigation */}
      <nav className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="text-xl font-bold">HireFlux</div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-4">
            <Link href="/signin" className="inline-flex items-center min-h-[44px]">
              <Button variant="ghost" size="lg">Sign In</Button>
            </Link>
            <Link href="/signup" className="inline-flex items-center min-h-[44px]">
              <Button size="lg">Sign Up</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            data-testid="mobile-menu-button"
            className="md:hidden p-2 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open mobile menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dialog */}
      <Dialog open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <DialogContent data-testid="mobile-menu" className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Menu</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <Link href="/signin" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start h-12">
                Sign In
              </Button>
            </Link>
            <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
              <Button className="w-full h-12">Sign Up</Button>
            </Link>
            <Link href="/pricing" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full justify-start h-12">
                Pricing
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hero Section - AIApply Style */}
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <section data-testid="hero-section" className="container mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Zap className="h-3 w-3 mr-1" />
              AI-Powered
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Stop Applying for Weeks<br />
              <span className="text-primary">Start Interviewing in Days</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              HireFlux finds high-match roles, tailors your resume & cover letter, auto-applies, 
              and coaches you live - so you move from submit to scheduled fast.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/signup" className="inline-flex items-center min-h-[44px]">
                <Button size="lg" className="h-12 px-8">
                  Start now for free
                </Button>
              </Link>
              <Link href="/pricing" className="inline-flex items-center min-h-[44px]">
                <Button variant="outline" size="lg" className="h-12 px-8">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Social Proof - Company Logos */}
        <section className="bg-muted/50 py-12">
          <div className="container mx-auto px-4">
            <p className="text-center text-sm text-muted-foreground mb-8">
              Get hired by top companies worldwide
            </p>
            <div className="flex items-center justify-center gap-8 opacity-60">
              <div className="text-2xl font-bold">Coinbase</div>
              <div className="text-2xl font-bold">Spotify</div>
              <div className="text-2xl font-bold">Microsoft</div>
              <div className="text-2xl font-bold">Meta</div>
              <div className="text-2xl font-bold">SpaceX</div>
            </div>
          </div>
        </section>

        {/* AI Resume Builder Demo */}
        <section className="container mx-auto px-4 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="outline" className="mb-4">
                <Target className="h-3 w-3 mr-1" />
                99.8% Match
              </Badge>
              <h2 className="text-3xl font-bold mb-6">Optimized Resume</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>AI generates resumes for each job application, based on your skills and experience.</p>
                <p>Our AI models are trained on successful resumes that have landed $100k+ jobs at top companies.</p>
              </div>
              <div className="mt-6">
                <Link href="/dashboard/resumes/builder" className="inline-flex items-center min-h-[44px]">
                  <Button size="lg">
                    <FileText className="h-4 w-4 mr-2" />
                    Try Resume Builder
                  </Button>
                </Link>
              </div>
            </div>
            <div className="bg-muted p-6 rounded-lg">
              <div className="bg-background p-4 rounded border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Steve Jobs</h3>
                  <Badge variant="secondary">99.8% match</Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  Los Altos, CA • steve@example.com • linkedin.com/stevejobs
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-2">Summary</p>
                  <p className="text-muted-foreground mb-4">
                    Visionary entrepreneur and technology innovator with a history of disrupting industries 
                    through pioneering design, user experience, and business strategy.
                  </p>
                  <p className="font-medium mb-2">Experience</p>
                  <div className="text-muted-foreground">
                    <p><strong>Co-Founder, Chairman & CEO</strong> | Apple Inc. (1997–2011)</p>
                    <p>• Launched Apple I and Apple II, the first mass-market personal computers</p>
                    <p>• Led development of the Macintosh, the first commercially successful GUI computer</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Auto Apply Dashboard Preview */}
        <section className="bg-primary py-24 text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Auto Apply To Jobs</h2>
              <p className="text-lg opacity-90">
                Let AI apply to thousands of jobs for you automatically. Save time and get hired faster
              </p>
            </div>
            <div className="max-w-4xl mx-auto">
              <div className="bg-background/10 backdrop-blur rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold">587 Jobs Applied</h3>
                  <Badge variant="secondary" className="bg-green-500 text-white">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Live Updates
                  </Badge>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-background/20 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">A</div>
                      <div>
                        <p className="font-medium">Principal Engineer</p>
                        <p className="text-sm opacity-75">Amazon • Cloud Services</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-yellow-500 text-black">AWS</Badge>
                      <Badge variant="outline" className="bg-blue-500 text-white">DevOps</Badge>
                      <Badge variant="secondary" className="bg-green-500 text-white">Applying...</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-background/20 rounded">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">S</div>
                      <div>
                        <p className="font-medium">Data Analyst</p>
                        <p className="text-sm opacity-75">Stripe • Finance</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-green-500 text-white">Analytics</Badge>
                      <Badge variant="outline" className="bg-blue-500 text-white">Python</Badge>
                      <Badge variant="secondary" className="bg-green-500 text-white">Applied</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Interview Buddy Preview */}
        <section className="container mx-auto px-4 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="bg-muted p-6 rounded-lg">
              <div className="bg-background p-4 rounded border">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-blue-500" />
                  <span className="font-semibold">Interview Buddy</span>
                  <Badge variant="secondary">4.7 • 387 Ratings</Badge>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded">
                    <p className="text-sm font-medium mb-2">Our enterprise sales cycle is 120 days; how would you shorten it?</p>
                    <p className="text-sm text-muted-foreground">
                      Map each account to a buying-committee heat-map, surface user-specific ROI dashboards 
                      in week 1, and secure a technical pilot inside 30 days.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Answer ⌘A</Button>
                    <Button size="sm" variant="outline">Reset ⌘R</Button>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl font-bold mb-6">Interview Buddy</h2>
              <p className="text-lg text-muted-foreground mb-6">
                Get real-time interview help and answers to interview questions.
              </p>
              <div className="bg-muted p-4 rounded-lg mb-6">
                <p className="text-sm italic">
                  "Interview Buddy is the future of job prep. It gave me perfectly tailored answers, 
                  anticipated follow-up questions, and helped me calm my nerves. Worth every penny!"
                </p>
                <p className="text-sm font-medium mt-2">- Jason T., Sales Executive</p>
              </div>
              <Link href="/dashboard/interview-buddy" className="inline-flex items-center min-h-[44px]">
                <Button size="lg">
                  <Users className="h-4 w-4 mr-2" />
                  Try Interview Buddy
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Success Stats */}
        <section className="bg-muted/50 py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">You are 80% more likely to get hired faster if you use HireFlux</h2>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div>
                <div className="text-4xl font-bold text-primary mb-2">372,241+</div>
                <p className="text-muted-foreground">roles applied to</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2">1,005,991</div>
                <p className="text-muted-foreground">users love us</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-primary mb-2">80%</div>
                <p className="text-muted-foreground">land interviews in first month</p>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-24">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Everything You Need to Accelerate Your Job Search
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              title="AI Resume Builder"
              description="Generate ATS-optimized resumes tailored to your target role in minutes. Multiple versions, professional tones, and instant exports."
              icon="📄"
            />
            <FeatureCard
              title="Smart Job Matching"
              description="Find high-fit opportunities with our AI-powered matching engine. Get personalized recommendations based on your skills and preferences."
              icon="🎯"
            />
            <FeatureCard
              title="Cover Letter Generator"
              description="Create compelling, personalized cover letters for each job. AI ensures authenticity and avoids generic templates."
              icon="✉️"
            />
            <FeatureCard
              title="Auto-Apply"
              description="Apply to multiple jobs automatically with pre-approved settings. Save time while maintaining quality applications."
              icon="⚡"
            />
            <FeatureCard
              title="Interview Coach"
              description="Practice with AI-powered mock interviews. Get instant feedback on your answers using the STAR framework."
              icon="🎤"
            />
            <FeatureCard
              title="Application Tracking"
              description="Manage your entire job search pipeline in one place. Track applications, interviews, and offers with analytics."
              icon="📊"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-primary py-24 text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold">Ready to Transform Your Job Search?</h2>
            <p className="mt-4 text-lg">
              Join thousands of job seekers who are landing interviews faster with HireFlux.
            </p>
            <div className="mt-8">
              <Link href="/signup" className="inline-flex items-center min-h-[44px]">
                <Button size="lg" variant="secondary">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 HireFlux. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4 text-4xl">{icon}</div>
      <h3 className="mb-2 text-xl font-semibold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
