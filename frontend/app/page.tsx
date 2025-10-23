import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Land Your Dream Job with{' '}
              <span className="text-primary">AI-Powered Assistance</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              HireFlux streamlines your job search with tailored resumes, personalized cover
              letters, intelligent job matching, and automated applications—all powered by AI.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/signup">
                <Button size="lg">Get Started Free</Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg">
                  View Pricing
                </Button>
              </Link>
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
              <Link href="/signup">
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
