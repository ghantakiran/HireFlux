'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Zap, Target, FileText, Users, TrendingUp, CheckCircle, Menu, X, Shield, Clock, Award, Building2 } from 'lucide-react';
import { SkipLink } from '@/components/skip-link';

type HeroTab = 'job_seeker' | 'employer';

export default function HomePage() {
  // Note: Page title set via metadata in root layout.tsx for WCAG 2.1 AA compliance (Issue #148)

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroTab, setHeroTab] = useState<HeroTab>('job_seeker');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Skip to Main Content */}
      <SkipLink />

      {/* Navigation - Fixed with scroll transition */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b dark:border-gray-700 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className={`text-xl font-bold transition-colors ${isScrolled ? 'text-gray-900 dark:text-gray-100' : 'text-gray-900 dark:text-gray-100'}`}>
            HireFlux
          </div>

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

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="focus:outline-none pt-16">
        {/* Hero Section - Two-Sided Toggle */}
        <section data-testid="hero-section" className="container mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            {/* Tab Toggle */}
            <div className="inline-flex rounded-full bg-muted p-1 mb-8" role="tablist">
              <button
                role="tab"
                aria-selected={heroTab === 'job_seeker'}
                onClick={() => setHeroTab('job_seeker')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  heroTab === 'job_seeker'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                I&apos;m Job Seeking
              </button>
              <button
                role="tab"
                aria-selected={heroTab === 'employer'}
                onClick={() => setHeroTab('employer')}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  heroTab === 'employer'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                I&apos;m Hiring
              </button>
            </div>

            {/* Hero Content */}
            {heroTab === 'job_seeker' ? (
              <div className="animate-fade-in" key="job_seeker">
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
            ) : (
              <div className="animate-fade-in" key="employer">
                <Badge variant="secondary" className="mb-4">
                  <Building2 className="h-3 w-3 mr-1" />
                  For Employers
                </Badge>
                <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
                  Hire Smarter<br />
                  <span className="text-primary">Not Harder</span>
                </h1>
                <p className="mt-6 text-lg leading-8 text-muted-foreground">
                  AI-powered job descriptions from minimal input, intelligent candidate ranking with
                  explainable Fit Index scores, and a full ATS - all in one platform.
                </p>
                <div className="mt-10 flex items-center justify-center gap-x-6">
                  <Link href="/employer/register" className="inline-flex items-center min-h-[44px]">
                    <Button size="lg" className="h-12 px-8">
                      Start hiring for free
                    </Button>
                  </Link>
                  <Link href="/pricing" className="inline-flex items-center min-h-[44px]">
                    <Button variant="outline" size="lg" className="h-12 px-8">
                      View Plans
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Stats Counters */}
        <section className="bg-muted/50 py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              <div className="text-center animate-count-up">
                <div className="text-3xl md:text-4xl font-bold text-primary">50K+</div>
                <p className="text-sm text-muted-foreground mt-1">Job Seekers</p>
              </div>
              <div className="text-center animate-count-up" style={{ animationDelay: '100ms' }}>
                <div className="text-3xl md:text-4xl font-bold text-primary">2K+</div>
                <p className="text-sm text-muted-foreground mt-1">Companies</p>
              </div>
              <div className="text-center animate-count-up" style={{ animationDelay: '200ms' }}>
                <div className="text-3xl md:text-4xl font-bold text-primary">370K+</div>
                <p className="text-sm text-muted-foreground mt-1">Applications</p>
              </div>
              <div className="text-center animate-count-up" style={{ animationDelay: '300ms' }}>
                <div className="text-3xl md:text-4xl font-bold text-primary">80%</div>
                <p className="text-sm text-muted-foreground mt-1">Interview Rate</p>
              </div>
            </div>

            {/* Company Logos */}
            <p className="text-center text-sm text-muted-foreground mb-6">
              Trusted by top companies worldwide
            </p>
            <div className="flex items-center justify-center gap-8 opacity-60 flex-wrap">
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
                  Los Altos, CA &bull; steve@example.com &bull; linkedin.com/stevejobs
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-2">Summary</p>
                  <p className="text-muted-foreground mb-4">
                    Visionary entrepreneur and technology innovator with a history of disrupting industries
                    through pioneering design, user experience, and business strategy.
                  </p>
                  <p className="font-medium mb-2">Experience</p>
                  <div className="text-muted-foreground">
                    <p><strong>Co-Founder, Chairman & CEO</strong> | Apple Inc. (1997&ndash;2011)</p>
                    <p>&bull; Launched Apple I and Apple II, the first mass-market personal computers</p>
                    <p>&bull; Led development of the Macintosh, the first commercially successful GUI computer</p>
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
                        <p className="text-sm opacity-75">Amazon &bull; Cloud Services</p>
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
                        <p className="text-sm opacity-75">Stripe &bull; Finance</p>
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
                  <Badge variant="secondary">4.7 &bull; 387 Ratings</Badge>
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
                    <Button size="sm" variant="outline">Answer &#8984;A</Button>
                    <Button size="sm" variant="outline">Reset &#8984;R</Button>
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
                  &ldquo;Interview Buddy is the future of job prep. It gave me perfectly tailored answers,
                  anticipated follow-up questions, and helped me calm my nerves. Worth every penny!&rdquo;
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

        {/* Trust Signals */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-2xl font-bold mb-8">Enterprise-Grade Security & Reliability</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              <div className="flex flex-col items-center text-center p-4">
                <Shield className="h-8 w-8 text-primary mb-2" />
                <p className="text-sm font-semibold">SOC2 Ready</p>
                <p className="text-xs text-muted-foreground mt-1">Compliance-first architecture</p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <Shield className="h-8 w-8 text-primary mb-2" />
                <p className="text-sm font-semibold">GDPR Compliant</p>
                <p className="text-xs text-muted-foreground mt-1">Your data, your control</p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <Clock className="h-8 w-8 text-primary mb-2" />
                <p className="text-sm font-semibold">99.9% Uptime</p>
                <p className="text-xs text-muted-foreground mt-1">Always available</p>
              </div>
              <div className="flex flex-col items-center text-center p-4">
                <Award className="h-8 w-8 text-primary mb-2" />
                <p className="text-sm font-semibold">256-bit Encryption</p>
                <p className="text-xs text-muted-foreground mt-1">Bank-level security</p>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="container mx-auto px-4 py-24">
          <h2 className="text-center text-3xl font-bold mb-12">What Our Users Say</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground italic mb-4">
                  &ldquo;I went from sending 50+ manual applications a week to landing 3 interviews in my first
                  week on HireFlux. The AI resume tailoring is a game-changer.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                    SM
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Sarah M.</p>
                    <p className="text-xs text-muted-foreground">Software Engineer, hired at Series B startup</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground italic mb-4">
                  &ldquo;We posted 15 roles in under an hour and had qualified candidates ranked by fit within
                  days. The AI-generated job descriptions saved our team hours.&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400 font-semibold">
                    JR
                  </div>
                  <div>
                    <p className="font-semibold text-sm">James R.</p>
                    <p className="text-xs text-muted-foreground">Head of Talent, 200-person SaaS company</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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
              icon={"\uD83D\uDCC4"}
            />
            <FeatureCard
              title="Smart Job Matching"
              description="Find high-fit opportunities with our AI-powered matching engine. Get personalized recommendations based on your skills and preferences."
              icon={"\uD83C\uDFAF"}
            />
            <FeatureCard
              title="Cover Letter Generator"
              description="Create compelling, personalized cover letters for each job. AI ensures authenticity and avoids generic templates."
              icon={"\u2709\uFE0F"}
            />
            <FeatureCard
              title="Auto-Apply"
              description="Apply to multiple jobs automatically with pre-approved settings. Save time while maintaining quality applications."
              icon={"\u26A1"}
            />
            <FeatureCard
              title="Interview Coach"
              description="Practice with AI-powered mock interviews. Get instant feedback on your answers using the STAR framework."
              icon={"\uD83C\uDFA4"}
            />
            <FeatureCard
              title="Application Tracking"
              description="Manage your entire job search pipeline in one place. Track applications, interviews, and offers with analytics."
              icon={"\uD83D\uDCCA"}
            />
          </div>
        </section>

        {/* CTA Section - Two-Sided */}
        <section className="bg-primary py-24 text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold">Ready to Transform Your Hiring Experience?</h2>
            <p className="mt-4 text-lg">
              Join thousands of job seekers and employers who are finding better matches faster with HireFlux.
            </p>
            <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
              <Link href="/signup" className="inline-flex items-center min-h-[44px]">
                <Button size="lg" variant="secondary" className="h-12 px-8">
                  Start Job Seeking
                </Button>
              </Link>
              <Link href="/employer/register" className="inline-flex items-center min-h-[44px]">
                <Button size="lg" variant="outline" className="h-12 px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10">
                  Start Hiring
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2026 HireFlux. All rights reserved.</p>
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
